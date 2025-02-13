'use client'

import React, { useState, ChangeEvent } from 'react';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const UploadImage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleRun = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const base64Image = await convertFileToBase64(selectedFile);
      const response = await axios.post(
        `${apiUrl}/api/detect`,
        { image: base64Image },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setResult(response.data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred while processing the image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-700 mb-4 text-center">Image Processor</h1>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleRun}
          disabled={loading || !selectedFile}
          className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all ${loading || !selectedFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {loading ? 'Processing...' : 'Run'}
        </button>
        {error && <div className="mt-4 text-red-500 text-center">Error: {error}</div>}
        {result && (
          <div className="mt-4 p-4 bg-gray-200 rounded-lg overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Result JSON</h2>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadImage;
