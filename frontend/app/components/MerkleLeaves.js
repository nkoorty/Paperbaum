'use client';

import { useState, useEffect } from 'react';
import { useSubstrate } from '../hooks/useSubstrate';

export default function MerkleLeaves() {
  const { api, error } = useSubstrate();
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    if (api) {
      const fetchLeaves = async () => {
        const storedLeaves = await api.query.paperMgmt.leaves();
        setLeaves(storedLeaves.toHuman());
      };

      fetchLeaves();
    }
  }, [api]);

  if (error) return <div>Error: {error}</div>;
  if (!api) return <div>Loading...</div>;

  return (
    <div>
      <h2>Merkle Tree Leaves</h2>
      <ul>
        {leaves.map((leaf, index) => (
          <li key={index}>{leaf}</li>
        ))}
      </ul>
    </div>
  );
}