'use client';

import dynamic from 'next/dynamic';

const FileUpload = dynamic(() => import('../components/FileUpload'), { ssr: false });

export default function UploadPage() {
  const handleUpload = () => {
    // Handle the upload logic here
    console.log('Paper uploaded');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Upload a Paper</h1>
      <FileUpload onUpload={handleUpload} />
    </div>
  );
}