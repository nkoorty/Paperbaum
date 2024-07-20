'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import NavBar from './components/NavBar'

const FileUpload = dynamic(() => import('./components/FileUpload'), { ssr: false });
const PaperList = dynamic(() => import('./components/PaperList'), { ssr: false });

export default function Home() {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1);
  }, []);

  return (
    <html className="flex min-h-screen flex-col items-center justify-between p-24">
      <head>
        <title>ZKnowledge</title>
      </head>
      <body>
        <div className={styles.container}>
          <NavBar />
          <div className={styles.content}>
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm pt-4">
              <FileUpload onUpload={triggerUpdate} />
              <PaperList key={updateTrigger} />
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}