'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { useSubstrate } from './hooks/useSubstrate';

const PaperList = dynamic(() => import('./components/PaperList'), { ssr: false });

export default function Home() {
  const { api, error: substrateError } = useSubstrate();
  const [papers, setPapers] = useState([]);
  const [error, setError] = useState(null);

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
          console.log('Fetching papers...');
          const entries = await api.query.paperMgmt.papers.entries();
          console.log('Raw paper entries:', entries);
          
          if (entries.length === 0) {
            console.log('No papers found in the chain state.');
          } else {
            entries.forEach(([key, value], index) => {
              console.log(`Paper ${index + 1}:`);
              console.log('Key:', key.toHuman());
              console.log('Value:', value.toHuman());
            });
          }
          
          const formattedPapers = entries.map(([key, value]) => {
            const hash = key.args[0].toHuman();
            const data = value.toHuman();
            console.log('Raw paper data:', data);
            return {
              hash,
              title: hexToString(data.title),
              authors: hexToString(data.authors),
              abstractText: hexToString(data.abstract_text),
              ipfsUrl: data.ipfs_url,
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

  if (substrateError) return <div>Substrate Error: {substrateError}</div>;
  if (error) return <div>Error: {error}</div>;
  if (!api) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.heroImageContainer}>
        <Image
          src="/zknowledge.jpg"
          alt="Background"
          layout="fill"
          objectFit="cover"
          quality={100}
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay}>
          <div className={styles.heroText}>
            <h1>Paperbaum</h1>
            <p>Discover and share research papers</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.uploadButton}>
          <Link href="/upload" className={styles.button}>
            Upload a Paper
          </Link>
        </div>

        <div className={styles.fullPaperList}>
          <PaperList papers={papers} />
        </div>
      </div>
    </div>
  );
}