import React from 'react';
import { Camera, Grid } from 'lucide-react';
import { useRouter } from 'next/router';

const LandingPage : React.FC = () => {
  const router = useRouter();
    
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4">Harmony Grid System Builder</h1>
          <p className="text-xl text-gray-300 mb-8">Create complex Unity environments faster with our intuitive grid system</p>
        </div>

        <div className="flex flex-col md:flex-row justify-center gap-8 max-w-3xl mx-auto">
          <div className="flex-1 bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-center mb-6">
              <Grid className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h2 className="text-2xl font-semibold mb-2">Grid Editor</h2>
              <p className="text-gray-400 mb-6">Create your environment manually using our interactive grid system</p>
              <button onClick={() => router.push('/editor')} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                Open Editor
              </button>
            </div>
          </div>

          <div className="flex-1 bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-center mb-6">
              <Camera className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h2 className="text-2xl font-semibold mb-2">Image Upload</h2>
              <p className="text-gray-400 mb-6">Convert your existing layouts by uploading an image</p>
              <button onClick={() => router.push('/upload')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                Upload Image
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-400">Our AI-powered system helps you create Unity environments a bit quicker</p>
          <div className="mt-8 flex justify-center gap-4">
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">Fast</span>
              <p className="text-sm text-gray-400">Quick Setup</p>
            </div>
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">Easy</span>
              <p className="text-sm text-gray-400">Intuitive Interface</p>
            </div>
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">Flexible</span>
              <p className="text-sm text-gray-400">Multiple Methods</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;