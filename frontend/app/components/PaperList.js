'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../page.module.css';

export default function PaperList({ papers }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    console.log('All papers:', papers);
  }, [papers]);

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

  return (
    <div className={styles.paperListContainer}>
      <h2 className={styles.sectionTitle}>All Papers</h2>
      <div className={styles.searchContainer}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search papers..."
          className={styles.searchInput}
        />
        <button onClick={handleSearch} disabled={isSearching} className={styles.searchButton}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      {isSearching ? (
        <p>Searching for papers...</p>
      ) : displayPapers.length === 0 ? (
        <p>No papers found.</p>
      ) : (
        displayPapers.map((paper, index) => {
          console.log(`Paper ${index}:`, paper);
          return (
            <div key={index} className={styles.paperDetails}>
              <h3>{paper.title}</h3>
              <p><strong>Authors:</strong> {paper.authors}</p>
              <p><strong>Keywords:</strong> {Array.isArray(paper.keywords) ? paper.keywords.join(', ') : paper.keywords}</p>
              <p>
                <strong>IPFS URL: </strong> 
                {paper.ipfsUrl || paper.ipfs_url ? (
                  <a href={paper.ipfsUrl || paper.ipfs_url} target="_blank" rel="noopener noreferrer">
                    {paper.ipfsUrl || paper.ipfs_url}
                  </a>
                ) : (
                  <a href="https://bafybeiekxcarjzxx4ck64tvyh6jq3br4ktf334omqnb4ab3ovqjdek43wi.ipfs.w3s.link/" target="_blank" rel="noopener noreferrer">
                    https://bafybeiekxcarjzxx4ck64tvyh6jq3br4ktf334omqnb4ab3ovqjdek43wi.ipfs.w3s.link/
                  </a>
                )}
              </p>
              {paper.similarity !== undefined && <p><strong>Similarity:</strong> {paper.similarity.toFixed(4)}</p>}
              <p><strong>Hash:</strong> {paper.hash}</p>
            </div>
          );
        })
      )}
    </div>
  );
}