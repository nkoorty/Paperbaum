import { useState, useRef } from 'react';
import { useSubstrate } from '../hooks/useSubstrate';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import axios from 'axios';
import styles from '../upload/uploadpage.module.css';

export default function FileUpload({ onUpload }) {
  const { api, error: substrateError } = useSubstrate();
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
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
    <div className={styles.fileUploadContainer}>
      <div className={styles.uploadArea}>
        <div
          className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className={styles.fileInput}
          />
          {file ? (
            <p className={styles.dropZoneText}>{file.name}</p>
          ) : (
            <>
              <p className={styles.dropZoneText}>Drop PDF file here</p>
              <p className={styles.dropZoneSubText}>or click to select</p>
            </>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={isUploading || !file}
          className={styles.uploadButton}
        >
          {isUploading ? 'Uploading...' : 'Upload Paper'}
        </button>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}
      {substrateError && <p className={styles.errorMessage}>Substrate Error: {substrateError}</p>}
      
      {response && (
        <div className={styles.uploadedPaper}>
          <h3 className={styles.uploadedPaperTitle}>Uploaded Paper:</h3>
          <p><strong>Title:</strong> {response.title}</p>
          <p><strong>Authors:</strong> {response.authors}</p>
          <p><strong>Abstract:</strong> {response.abstract}</p>
          <p><strong>Keywords:</strong> {response.keywords.join(', ')}</p>
          <p>
            <strong>IPFS URL:</strong>{' '}
            <a href={response.ipfsUrl} target="_blank" rel="noopener noreferrer">
              {response.ipfsUrl}
            </a>
          </p>
        </div>
      )}
      
      {txHash && (
        <p className={styles.txHash}>
          <strong>Transaction Hash:</strong> {txHash}
        </p>
      )}
    </div>
  );
}