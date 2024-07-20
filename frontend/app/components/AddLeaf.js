'use client';

import { useState, useEffect } from 'react';
import { useSubstrate } from '../hooks/useSubstrate';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';

export default function AddLeaf() {
  const { api, error } = useSubstrate();
  const [leaf, setLeaf] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');

  useEffect(() => {
    const getAccounts = async () => {
      await web3Enable('zKnowledgeBase');
      const allAccounts = await web3Accounts();
      setAccounts(allAccounts);
      if (allAccounts.length > 0) {
        setSelectedAccount(allAccounts[0].address);
      }
    };

    getAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!api || !selectedAccount) return;

    try {
      const injector = await web3FromSource(accounts.find(acc => acc.address === selectedAccount).meta.source);
      const tx = api.tx.paperMgmt.addLeaf(leaf);
      await tx.signAndSend(selectedAccount, { signer: injector.signer });
      setLeaf('');
      alert('Leaf added successfully!');
    } catch (err) {
      console.error('Error adding leaf:', err);
      alert('Error adding leaf. See console for details.');
    }
  };

  if (error) return <div>Error: {error}</div>;
  if (!api) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <select
        value={selectedAccount}
        onChange={(e) => setSelectedAccount(e.target.value)}
      >
        {accounts.map((account) => (
          <option key={account.address} value={account.address}>
            {account.meta.name} ({account.address})
          </option>
        ))}
      </select>
      <input
        type="text"
        value={leaf}
        onChange={(e) => setLeaf(e.target.value)}
        placeholder="Enter leaf hash"
      />
      <button type="submit">Add Leaf</button>
    </form>
  );
}