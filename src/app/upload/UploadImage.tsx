'use client'

import React, { useState, ChangeEvent, useEffect } from 'react';
import axios from 'axios';
import { ImageGridData } from '../types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hgs-web.onrender.com';

// Define the model status interface
interface ModelStatus {
  isLoaded: boolean;
  isLoading: boolean;
  message: string;
}

const UploadImage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImageGridData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Add state for model status
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    isLoaded: false,
    isLoading: false,
    message: "Initializing OCR model..."
  });

  // Function to check model status
  const checkModelStatus = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/status`);
      if (response.data.status === 'ready') {
        setModelStatus({
          isLoaded: true,
          isLoading: false,
          message: "OCR model is ready"
        });
        return true;
      } else if (response.data.status === 'loading') {
        setModelStatus({
          isLoaded: false,
          isLoading: true,
          message: "OCR model is loading... This may take a minute."
        });
      } else {
        setModelStatus({
          isLoaded: false,
          isLoading: false,
          message: "OCR model not loaded"
        });
      }
      return false;
    } catch (error) {
      console.error("Error checking model status:", error);
      setModelStatus({
        isLoaded: false,
        isLoading: false,
        message: "Error connecting to server"
      });
      return false;
    }
  };
  
  // Function to initiate model loading
  const startModelLoading = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/preload`);
      if (response.data.status === 'ready') {
        setModelStatus({
          isLoaded: true,
          isLoading: false,
          message: "OCR model is ready"
        });
      } else {
        setModelStatus({
          isLoaded: false,
          isLoading: true,
          message: "OCR model is loading... This may take a minute."
        });
        
        // Start polling for status
        const intervalId = setInterval(async () => {
          const isReady = await checkModelStatus();
          if (isReady) {
            clearInterval(intervalId);
          }
        }, 5000); // Check every 5 seconds
        
        // Clean up interval after 5 minutes (timeout safety)
        setTimeout(() => clearInterval(intervalId), 300000);
      }
    } catch (error) {
      console.error("Error starting model load:", error);
      setModelStatus({
        isLoaded: false,
        isLoading: false,
        message: "Error connecting to server"
      });
    }
  };
  
  // On component mount, start preloading the model
  useEffect(() => {
    startModelLoading();
  }, []);

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
    
    // Check if model is ready before processing
    const isReady = await checkModelStatus();
    if (!isReady) {
      setError("OCR model is still loading. Please wait a moment and try again.");
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
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 200000 
        }
      );
      setResult(response.data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred while processing the image.');
    } finally {
      setLoading(false);
    }
  };

  // Generate status indicator styles
  const getStatusClasses = () => {
    const baseClasses = "mt-4 p-3 rounded-lg text-center";
    
    if (modelStatus.isLoaded) {
      return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
    } else if (modelStatus.isLoading) {
      return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
    } else {
      return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-700 mb-4 text-center">Image Processor</h1>
        
        {/* Model status indicator */}
        <div className={getStatusClasses()}>
          <p>{modelStatus.message}</p>
        </div>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer p-2 my-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleRun}
          disabled={loading || !selectedFile || modelStatus.isLoading}
          className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all ${loading || !selectedFile || modelStatus.isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {loading ? 'Processing...' : 'Run'}
        </button>
        {error && <div className="mt-4 text-red-500 text-center">Error: {error}</div>}
        {loading && (
          <div className="mt-4 text-blue-500 text-center">
            Processing your image... This may take up to 2 minutes for larger images.
          </div>
        )}
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