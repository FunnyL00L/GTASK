import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe, ArrowRight, Settings } from 'lucide-react';

interface SetupProps {
  onSetup: (url: string) => void;
}

export default function Setup({ onSetup }: SetupProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('https://script.google.com')) {
      setError('Please enter a valid Google Apps Script URL');
      return;
    }
    onSetup(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4">
            <Settings className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Initial Setup</h1>
          <p className="text-slate-500 mt-2">Connect your Google Apps Script backend to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Master GAS URL
            </label>
            <input
              type="url"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            Connect Backend <ArrowRight className="w-5 h-5" />
          </button>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-500 leading-relaxed">
            <strong>Note:</strong> This URL is stored locally in your browser. You can change it later in the application settings.
          </div>
        </form>
      </motion.div>
    </div>
  );
}
