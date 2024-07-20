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
    return response.data[0].embedding;
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

function cosineSimilarity(vecA, vecB) {
    // Ensure both vectors are arrays of numbers
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
          {"role": "system", "content": `You are an assistant that extracts information from academic papers. Format your response exactly as shown in the example, with hexadecimal encoding for the title and authors when they contain non-ASCII characters.`},
          {"role": "user", "content": `Extract the following information from the given text:
          1. Title (hexadecimal encoded if it contains non-ASCII characters, otherwise plain text)
          2. Authors (hexadecimal encoded if it contains non-ASCII characters, otherwise plain text)
          3. Abstract (plain text)
          4. 5 keywords (as an array of strings)
  
          Format your response exactly like this:
          {
            title: "Paper Title Here" or hex if you have to,
            authors: "Author Names Here" or hex if you have to,
            abstract: "Abstract text here (not hexadecimal encoded)",
            keywords: [
              "keyword1",
              "keyword2",
              "keyword3",
              "keyword4",
              "keyword5"
            ]
          }
  
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
        const parsedResponse = rawResponse.match(/\{([^}]+)\}/)[1];
        const fields = parsedResponse.split(',').map(field => field.trim());
        
        metadata = {
          title: fields.find(f => f.startsWith('title:')).split(':')[1].trim().replace(/^"|"$/g, ''),
          authors: fields.find(f => f.startsWith('authors:')).split(':')[1].trim().replace(/^"|"$/g, ''),
          abstract: fields.find(f => f.startsWith('abstract:')).split(':')[1].trim().replace(/^"|"$/g, ''),
          keywords: JSON.parse(fields.find(f => f.startsWith('keywords:')).split(':')[1].trim())
        };

        // Decode hexadecimal strings
        metadata.title = metadata.title.startsWith('0x') ? hexToString(metadata.title) : metadata.title;
        metadata.authors = metadata.authors.startsWith('0x') ? hexToString(metadata.authors) : metadata.authors;

      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        throw new Error('Failed to parse metadata from the paper');
      }
  
      // Generate embedding
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
  
      // Store the paper in memory
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

      // Convert query embedding to the same format as stored vectors
      const queryVector = '0x' + queryEmbedding.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');

      const results = papers.map(paper => {
        const similarity = cosineSimilarity(queryVector, paper.vector);
        return {
          ...paper,
          similarity: similarity
        };
      }).sort((a, b) => b.similarity - a.similarity);

      console.log('Search results:', results.map(r => ({ title: r.title, similarity: r.similarity })));

      res.json(results);
    } catch (error) {
      console.error('Error in search:', error);
      res.status(500).send('An error occurred during search: ' + error.message);
    }
});

// New endpoint to get all papers (for testing purposes)
app.get('/papers', (req, res) => {
  res.json(papers);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await getW3UpClient();
  console.log(`Server is running on port ${PORT}`);
});
