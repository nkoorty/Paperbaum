import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { create } from '@web3-storage/w3up-client';
import { promises as fs } from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import OpenAI from 'openai';
import path from 'path';

const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let w3upClient;

// Temporary in-memory storage for papers
let papers = [];

async function setupW3UpClient() {
  const client = await create();
  await client.login('amalyshau2002@gmail.com');
  await client.setCurrentSpace('did:key:z6MkhqwPSRZeb4qLL9rpxXgbq3iXrEXsu8xPf7vzyjDpDah8');
  return client;
}

async function getW3UpClient() {
  if (!w3upClient) {
    w3upClient = await setupW3UpClient();
  }
  return w3upClient;
}

async function uploadToIPFS(filePath) {
  const client = await getW3UpClient();

  try {
    const content = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const file = new Blob([content], { type: 'application/octet-stream' });
    Object.defineProperty(file, 'name', {
      value: fileName,
      writable: false,
    });

    const cid = await client.uploadFile(file);
    return `https://w3s.link/ipfs/${cid}`;
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    return null;
  }
}

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding.slice(0, 100);
}

function hexToString(hex) {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

function hexToVector(hexString) {
  const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  return hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16) / 255);
}

function cosineSimilarity(vecA, vecB) {
  const a = Array.isArray(vecA) ? vecA : hexToVector(vecA);
  const b = Array.isArray(vecB) ? vecB : hexToVector(vecB);

  const dotProduct = a.reduce((sum, a, i) => sum + a * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const fileBuffer = await fs.readFile(req.file.path);
    const pdfData = await pdf(fileBuffer);
    const text = pdfData.text.substring(0, 4000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {"role": "system", "content": `You are an assistant that extracts information from academic papers.`},
        {"role": "user", "content": `Extract the following information from the given text:
        1. Title
        2. Authors
        3. Abstract
        4. 5 keywords

        Format your response exactly like this:
        Title: [Title here]
        Authors: [Authors here]
        Abstract: [Abstract here]
        Keywords: [keyword1], [keyword2], [keyword3], [keyword4], [keyword5]

        Text to extract from:
        ${text}`}
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    console.log('OpenAI API response:', response.choices[0].message.content);

    let metadata;
    try {
      const rawResponse = response.choices[0].message.content;
      console.log('Raw OpenAI response:', rawResponse);

      // Extract information using regex
      const titleMatch = rawResponse.match(/Title:\s*(.*)/);
      const authorsMatch = rawResponse.match(/Authors:\s*(.*)/);
      const abstractMatch = rawResponse.match(/Abstract:\s*([\s\S]*?)(?=\nKeywords:)/);
      const keywordsMatch = rawResponse.match(/Keywords:\s*(.*)/);

      if (!titleMatch || !authorsMatch || !abstractMatch || !keywordsMatch) {
        throw new Error('Failed to extract all required fields from the OpenAI response');
      }

      metadata = {
        title: titleMatch[1].trim(),
        authors: authorsMatch[1].trim(),
        abstract: abstractMatch[1].trim(),
        keywords: keywordsMatch[1].split(',').map(k => k.trim())
      };

      console.log('Parsed metadata:', metadata);

    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response:', response.choices[0].message.content);
      throw new Error('Failed to parse metadata from the paper');
    }

    const embeddingText = `${metadata.title} ${metadata.abstract} ${metadata.keywords.join(' ')}`;
    const embedding = await generateEmbedding(embeddingText);

    const ipfsUrl = await uploadToIPFS(req.file.path);

    if (!ipfsUrl) {
      throw new Error('Failed to upload to IPFS');
    }

    await fs.unlink(req.file.path);

    const paper = {
      ...metadata,
      ipfsUrl: ipfsUrl,
      vector: '0x' + embedding.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
    };

    papers.push(paper);

    res.json(paper);
  } catch (error) {
    console.error('Error in /upload:', error);
    res.status(500).send('An error occurred during file processing: ' + error.message);
  }
});

app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    console.log('Received search query:', query);
    console.log('Current papers in memory:', papers);

    if (papers.length === 0) {
      console.log('No papers found in memory');
      return res.json([]);
    }

    const queryEmbedding = await generateEmbedding(query);
    const queryVector = '0x' + queryEmbedding.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');

    const results = papers.map(paper => ({
      ...paper,
      similarity: cosineSimilarity(queryVector, paper.vector)
    })).sort((a, b) => b.similarity - a.similarity);

    console.log('Search results:', results.map(r => ({ title: r.title, similarity: r.similarity })));

    res.json(results);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).send('An error occurred during search: ' + error.message);
  }
});

app.get('/papers', (req, res) => {
  res.json(papers);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await getW3UpClient();
  console.log(`Server is running on port ${PORT}`);
});