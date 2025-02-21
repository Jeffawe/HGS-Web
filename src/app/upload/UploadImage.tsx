'use client'

import React, { useState } from 'react';

const UploadImage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate a delay to show the loading state
      setTimeout(() => {
        window.location.href = 'https://colab.research.google.com/drive/18eD4Elnh8Pt1CRidhv7u1h9bt0pVGWf8#scrollTo=ls9AALizHi0T';
      }, 1000);
    } catch {
      setError('An error occurred while redirecting. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-lg transform transition-all hover:scale-105">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Image Processor</h1>
        <p className="text-gray-600 text-center mb-6">
          Due to the large size of the image processing application, it cannot be hosted directly on this website.
          However, I&apos;ve made it easy for you to access it on Google Colab. Simply click the button below, and you&apos;ll
          be redirected to the Colab notebook where you can run the image processor. Please follow the instructions
          provided there.
        </p>
        <button
          onClick={handleRun}
          disabled={loading}
          className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all flex items-center justify-center ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-3 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Redirecting...
            </>
          ) : (
            'Run Image Processor'
          )}
        </button>
        {error && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg text-red-600 text-center">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadImage;
