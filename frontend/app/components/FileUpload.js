'use client';

import { useState } from 'react';
import axios from 'axios';
import { useSubstrate } from '../hooks/useSubstrate';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';

export default function FileUpload({ onUpload }) {
  const { api, error: substrateError } = useSubstrate();
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    console.log('File selected:', event.target.files[0].name);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResponse(null);
    setTxHash(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Starting file upload to IPFS...');
      const res = await axios.post('http://localhost:3000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Server response:', res.data);
      setResponse(res.data);

      if (!api) throw new Error('Substrate API not available');
      console.log('Substrate API available');

      console.log('Enabling Web3...');
      await web3Enable('ZK');

      const accounts = await web3Accounts();
      console.log('Available accounts:', accounts);
      if (accounts.length === 0) throw new Error('No accounts found. Please connect your wallet.');

      const account = accounts[0];
      console.log('Using account:', account.address);
      const injector = await web3FromSource(account.meta.source);
      console.log('Injector obtained:', injector);

      const { title, authors, abstract, ipfsUrl, keywords, vector } = res.data;

      const tx = api.tx.paperMgmt.addPaper(
        title,
        authors,
        abstract,
        ipfsUrl,
        vector,
        keywords
      );

      console.log('Transaction created:', tx.method.toHuman());

      console.log('Signing and sending transaction...');
      await new Promise((resolve, reject) => {
        tx.signAndSend(account.address, { signer: injector.signer }, (result) => {
          console.log('Transaction status:', result.status.type);
          if (result.status.isInBlock) {
            console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            setTxHash(result.status.asInBlock.toString());
            result.events.forEach(({ event: { data, method, section } }) => {
              console.log(`Event: ${section}.${method}::`, data.toHuman());
            });
          } else if (result.status.isFinalized) {
            console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
            resolve();
          } else if (result.dispatchError) {
            console.error('Transaction failed:', result.dispatchError.toHuman());
            if (result.dispatchError.isModule) {
              const decoded = api.registry.findMetaError(result.dispatchError.asModule);
              const { docs, name, section } = decoded;
              console.error(`Error details: ${section}.${name}: ${docs.join(' ')}`);
            }
            reject(new Error(`Transaction failed: ${JSON.stringify(result.dispatchError.toHuman())}`));
          }
        }).catch(error => {
          console.error('SignAndSend error:', error);
          reject(error);
        });
      });

      console.log('Transaction completed successfully');
      onUpload();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('An error occurred: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload PDF</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} accept=".pdf" disabled={isUploading} />
        <button type="submit" disabled={isUploading || !file}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {substrateError && <p style={{color: 'red'}}>Substrate Error: {substrateError}</p>}
      {response && (
        <div>
          <h3>Uploaded Paper:</h3>
          <p><strong>Title:</strong> {response.title}</p>
          <p><strong>Authors:</strong> {response.authors}</p>
          <p><strong>Abstract:</strong> {response.abstract}</p>
          <p><strong>Keywords:</strong> {response.keywords.join(', ')}</p>
          <p><strong>IPFS URL:</strong> <a href={response.ipfsUrl} target="_blank" rel="noopener noreferrer">{response.ipfsUrl}</a></p>
        </div>
      )}
      {txHash && <p><strong>Transaction Hash:</strong> {txHash}</p>}
    </div>
  );
}