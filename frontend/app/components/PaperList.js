'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from '../page.module.css';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
  ssr: false,
  loading: () => <p>Loading graph...</p>
});

const PaperGraph = ({ papers }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('PaperGraph received papers:', papers);
    try {
      const nodes = papers.map(paper => ({ id: paper.hash, name: paper.title }));
      const links = papers.slice(1).map(paper => ({
        source: papers[0].hash,
        target: paper.hash
      }));
      console.log('Graph data:', { nodes, links });
      setGraphData({ nodes, links });
    } catch (err) {
      console.error('Error creating graph data:', err);
      setError(err.message);
    }
  }, [papers]);

  if (error) {
    return <div>Error rendering graph: {error}</div>;
  }

  if (graphData.nodes.length === 0) {
    return <div>No data available for graph</div>;
  }

  return (
    <div className={styles.graphContainer}>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="name"
        nodeColor={() => '#4a90e2'}
        linkColor={() => '#999'}
        width={800}
        height={300}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000000';
          ctx.fillText(label, node.x, node.y);

          node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          const bckgDimensions = node.__bckgDimensions;
          bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
        }}
      />
    </div>
  );
};

export default function PaperList({ papers }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedPapers, setExpandedPapers] = useState({});

  useEffect(() => {
    console.log('PaperList received papers:', papers);
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

  const togglePaperExpansion = (paperHash) => {
    setExpandedPapers(prev => ({
      ...prev,
      [paperHash]: !prev[paperHash]
    }));
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
        displayPapers.map((paper, index) => (
          <div key={index} className={styles.paperCard}>
            <div className={styles.paperHeader} onClick={() => togglePaperExpansion(paper.hash)}>
              <h3>{paper.title}</h3>
              {expandedPapers[paper.hash] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            <div className={styles.paperContent}>
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
            {expandedPapers[paper.hash] && (
              <PaperGraph papers={displayPapers.slice(index, index + 3)} />
            )}
          </div>
        ))
      )}
    </div>
  );
}