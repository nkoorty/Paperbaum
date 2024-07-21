'use client';

import dynamic from 'next/dynamic';
import styles from './uploadpage.module.css';

const FileUpload = dynamic(() => import('../components/FileUpload'), { ssr: false });

export default function UploadPage() {
  const handleUpload = () => {
    console.log('Paper uploaded');
  };

  return (
    <div className={styles.pageContainer}>
      {/* <h1 className={styles.pageTitle}>Upload a Paper</h1> */}
      <div className={styles.uploadComponentWrapper}>
        <FileUpload onUpload={handleUpload} />
      </div>
    </div>
  );
}