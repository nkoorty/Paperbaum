'use client';

import { useState, useEffect } from 'react';
import { useSubstrate } from '../hooks/useSubstrate';
import axios from 'axios';

export default function PaperList() {
  const { api, error: substrateError } = useSubstrate();
  const [papers, setPapers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const hexToString = (hex) => {
    if (typeof hex !== 'string' || !hex.startsWith('0x')) return hex;
    try {
      return decodeURIComponent(
        hex.slice(2).replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&')
      );
    } catch (e) {
      console.error('Failed to decode hex string:', hex, e);
      return hex;
    }
  };

  useEffect(() => {
    if (api) {
      const fetchPapers = async () => {
        try {
          const entries = await api.query.paperMgmt.papers.entries();
          console.log('Fetched paper entries:', entries);
          
          const formattedPapers = entries.map(([key, value]) => {
            const hash = key.args[0].toHuman();
            const data = value.toHuman();
            return {
              hash,
              title: hexToString(data.title),
              authors: hexToString(data.authors),
              abstractText: hexToString(data.abstractText),
              ipfsUrl: data.ipfsUrl,
              vector: data.vector,
              keywords: Array.isArray(data.keywords) 
                ? data.keywords.map(hexToString) 
                : hexToString(data.keywords),
            };
          });

          console.log('Formatted papers:', formattedPapers);
          setPapers(formattedPapers);
        } catch (err) {
          console.error('Error fetching papers:', err);
          setError('Failed to fetch papers: ' + err.message);
        }
      };

      fetchPapers();
    }
  }, [api]);

  const handleSearch = async () => {
    console.log('Starting search with query:', searchQuery);
    setIsSearching(true);
    try {
      const response = await axios.post('http://localhost:3000/search', { query: searchQuery });
      console.log('Search results received:', response.data);
      if (response.data.length === 0) {
        console.log('No results found for the search query');
      }
      setSearchResults(response.data);
    } catch (err) {
      console.error('Error searching papers:', err);
      setError('Failed to search papers: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const displayPapers = searchResults.length > 0 ? searchResults : papers;

  console.log('Current display papers:', displayPapers);

  if (substrateError) return <div>Substrate Error: {substrateError}</div>;
  if (error) return <div>Error: {error}</div>;
  if (!api) return <div>Loading...</div>;

  return (
    <div>
      <h2>Uploaded Papers</h2>
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search papers..."
        />
        <button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      {isSearching ? (
        <p>Searching for papers...</p>
      ) : displayPapers.length === 0 ? (
        <p>No papers found.</p>
      ) : (
        displayPapers.map((paper, index) => (
          <div key={index} style={{marginBottom: '20px', border: '1px solid #ccc', padding: '10px'}}>
            <h3>{paper.title}</h3>
            <p><strong>Authors:</strong> {paper.authors}</p>
            <p><strong>Abstract:</strong> {paper.abstractText}</p>
            <p><strong>Keywords:</strong> {Array.isArray(paper.keywords) ? paper.keywords.join(', ') : paper.keywords}</p>
            <p><strong>IPFS URL:</strong> <a href={paper.ipfsUrl} target="_blank" rel="noopener noreferrer">{paper.ipfsUrl}</a></p>
            {paper.similarity !== undefined && <p><strong>Similarity:</strong> {paper.similarity.toFixed(4)}</p>}
            <p><strong>Hash:</strong> {paper.hash}</p>
          </div>
        ))
      )}
    </div>
  );
}