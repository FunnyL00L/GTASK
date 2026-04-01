import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, UserConfig } from '../types';
import { motion } from 'motion/react';
import { Globe, LogIn, UserPlus } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  gasUrl: string;
}

export default function Login({ onLogin, gasUrl }: LoginProps) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Logging in...');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'login',
          username: credentials.username,
          password: credentials.password,
        }),
      });
      const result = await response.json();

      if (result.success) {
        setLoadingMessage('Downloading all data...');
        // Fetch all data from GAS to sync local storage
        try {
          const dataRes = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({ 
              action: 'get_data',
              username: credentials.username,
            }),
          });
          const dataResult = await dataRes.json();
          
          if (dataResult.success) {
            const { finance, tasks } = dataResult;
            localStorage.setItem('gtaskflow_local_data', JSON.stringify({
              finance: finance || [],
              tasks: tasks || [],
              lastSync: new Date().toISOString()
            }));
          }
        } catch (e) {
          console.error('Initial sync failed', e);
        }

        if (!result.user.config.gasUrl) {
          alert('Warning: No GAS API URL found in settings. System will run in Local Mode.');
        } else {
          alert('Login Successful! Welcome back.');
        }
        onLogin(result.user);
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
      setLoadingMessage('Logging in...');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">GTask Flow</h1>
          <p className="text-slate-500 mt-2">Login to your management system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {loadingMessage}
              </div>
            ) : <><LogIn className="w-5 h-5" /> Login</>}
          </button>

          <div className="text-center mt-6">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:underline flex items-center justify-center gap-1 mt-2">
                <UserPlus className="w-4 h-4" /> Register Now
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
