import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserConfig } from '../types';
import { motion } from 'motion/react';
import { Database, Key, Save, Globe, Download } from 'lucide-react';
import { callGAS, getLocalData } from '../services/api';

interface ConfigProps {
  user: User;
  onUpdate: (config: UserConfig) => void;
  masterGasUrl: string;
}

export default function Config({ user, onUpdate, masterGasUrl }: ConfigProps) {
  const [config, setConfig] = useState<UserConfig>(user.config);
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [error, setError] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const navigate = useNavigate();

  const handleDownloadData = () => {
    const localData = getLocalData();
    const dataStr = JSON.stringify(localData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `gtaskflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ALWAYS use masterGasUrl for account settings
      const result = await callGAS(masterGasUrl, {
        action: 'save_config',
        username: user.username,
        config,
      });

      if (result.success) {
        onUpdate(config);
        alert('Settings saved successfully!');
      } else {
        throw new Error(result.message || 'Failed to save config');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }

    setPassLoading(true);
    setPassError('');
    setPassSuccess('');

    try {
      // ALWAYS use masterGasUrl for account settings
      const result = await callGAS(masterGasUrl, {
        action: 'change_password',
        username: user.username,
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      });

      if (result.success) {
        setPassSuccess('Password changed successfully!');
        setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        throw new Error(result.message || 'Failed to change password');
      }
    } catch (err: any) {
      setPassError(err.message || 'Error changing password');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-8"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
            <p className="text-slate-500">Manage your backend and notifications</p>
          </div>
        </div>

        <form onSubmit={handleConfigSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="628123456789"
                value={config.waNumber || ''}
                onChange={(e) => setConfig({ ...config, waNumber: e.target.value })}
              />
              <p className="text-[10px] text-slate-400 mt-1">This phone number will be used for task reminders and transaction records.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GAS API URL (Optional)</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="https://script.google.com/..."
                value={config.gasUrl || ''}
                onChange={(e) => setConfig({ ...config, gasUrl: e.target.value })}
              />
              <p className="text-[10px] text-slate-400 mt-1">Leave empty to use Local Browser Storage. Input your personal GAS URL to sync across devices.</p>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : <><Save className="w-5 h-5" /> Save System Settings</>}
            </button>
            <button
              type="button"
              onClick={handleDownloadData}
              className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Download All Data (JSON)
            </button>
          </div>
        </form>
      </motion.div>

      {/* Password Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-8"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Security</h2>
            <p className="text-slate-500">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              value={passwords.oldPassword}
              onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          {passError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{passError}</p>}
          {passSuccess && <p className="text-emerald-500 text-sm bg-emerald-50 p-3 rounded-lg">{passSuccess}</p>}

          <div className="pt-4">
            <button
              type="submit"
              disabled={passLoading}
              className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {passLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
