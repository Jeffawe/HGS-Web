import React, { useState, ChangeEvent } from 'react';
import axios from 'axios';

const UploadImage: React.FC = () => {
  // Local state for the file, result, loading indicator, and any error messages.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  // Helper function to convert a File into a base64-encoded string
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URI prefix (e.g., "data:image/png;base64,") if necessary
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle the button click to run the processing
  const handleRun = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      // Convert the file to a base64 string
      const base64Image = await convertFileToBase64(selectedFile);

      // Send a POST request using axios to your serverless function endpoint
      const response = await axios.post(
        '/api/detect',
        { image: base64Image },
        { headers: { 'Content-Type': 'application/json' } }
      );

      
      // Set the resulting JSON data into state
      setResult(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while processing the image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Image Processor</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleRun} disabled={loading || !selectedFile} style={{ marginLeft: '1rem' }}>
        {loading ? 'Processing...' : 'Run'}
      </button>

      {error && <div style={{ color: 'red', marginTop: '1rem' }}>Error: {error}</div>}

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Result JSON</h2>
          <pre style={{ backgroundColor: '#f4f4f4', padding: '1rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UploadImage;
