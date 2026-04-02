import React, { useState, useEffect, useRef } from 'react';
import { UserConfig, FinanceEntry, User } from '../types';
import { callGAS } from '../services/api';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  FileText, 
  Download,
  Search,
  Filter,
  Wallet,
  X,
  Camera,
  Image as ImageIcon,
  Clock,
  ChevronRight,
  Trash2,
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Tesseract from 'tesseract.js';

import { formatCompactNumber } from '../lib/utils';

interface FinanceProps {
  config: UserConfig;
  user: User;
}

export default function Finance({ config, user }: FinanceProps) {
  const { finance: entries, loading, addFinance, updateFinance, deleteFinance } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  
  const [newEntry, setNewEntry] = useState<Partial<FinanceEntry>>({
    type: 'expense',
    amount: 0,
    category: '',
    source_destination: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    receipt_url: '',
  });

  const [displayAmount, setDisplayAmount] = useState('0');

  const [selectedEntry, setSelectedEntry] = useState<FinanceEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.source_destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (entry: FinanceEntry) => {
    setEditingEntry(entry);
    setNewEntry({
      type: entry.type,
      amount: entry.amount,
      category: entry.category,
      source_destination: entry.source_destination,
      description: entry.description,
      date: format(new Date(entry.date), 'yyyy-MM-dd'),
      receipt_url: entry.receipt_url,
    });
    setDisplayAmount(entry.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
    setShowForm(true);
  };

  const [itemToDelete, setItemToDelete] = useState<{id: string, created_at: string} | null>(null);

  const confirmDelete = (id: string, created_at: string) => {
    setItemToDelete({ id, created_at });
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      await deleteFinance(itemToDelete.id, itemToDelete.created_at);
      setItemToDelete(null);
    }
  };

  const formatCurrency = (val: string) => {
    // Remove non-digits
    const digits = val.replace(/\D/g, '');
    // Remove leading zeros
    const clean = digits.replace(/^0+/, '') || '0';
    // Format with dots
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatCurrency(val);
    setDisplayAmount(formatted);
    setNewEntry({ ...newEntry, amount: Number(formatted.replace(/\./g, '')) });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await callGAS(config.gasUrl, {
        action: 'upload_image',
        username: user.username,
        image: base64
      });

      if (result.success) {
        setNewEntry({ ...newEntry, receipt_url: result.url });
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const result = await Tesseract.recognize(file, 'ind');
      const text = result.data.text;
      
      setNewEntry(prev => ({
        ...prev,
        description: (prev.description ? prev.description + '\n\n' : '') + '--- Hasil Scan Nota ---\n' + text
      }));

      const lines = text.split('\n');
      let foundAmount = 0;
      for (const line of lines) {
        if (line.toLowerCase().includes('total') || line.toLowerCase().includes('jumlah')) {
          const numbers = line.replace(/[^0-9]/g, '');
          if (numbers && parseInt(numbers) > foundAmount) {
            foundAmount = parseInt(numbers);
          }
        }
      }
      
      if (foundAmount > 0) {
        setNewEntry(prev => ({ ...prev, amount: foundAmount }));
        setDisplayAmount(formatCurrency(foundAmount.toString()));
      }

    } catch (error) {
      console.error("OCR Error:", error);
      alert("Gagal memindai nota.");
    } finally {
      setScanning(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    let location = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
      );
      
      // Reverse Geocoding to get area name
      let locationName = '';
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10`);
        const geoData = await geoRes.json();
        locationName = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || 'Unknown Area';
      } catch (geoErr) {
        console.log('Reverse geocoding failed', geoErr);
      }

      location = { 
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude,
        name: locationName
      };
    } catch (err) {
      console.log('Location access denied or timeout');
    }

    let success = false;
    if (editingEntry) {
      success = await updateFinance({
        id: editingEntry.id,
        created_at: editingEntry.created_at,
        ...newEntry,
        location: location || editingEntry.location
      });
    } else {
      success = await addFinance({
        ...newEntry,
        location
      });
    }

    if (success) {
      setNewEntry({
        type: 'expense',
        amount: 0,
        category: '',
        source_destination: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        receipt_url: '',
      });
      setDisplayAmount('0');
      setShowForm(false);
      setEditingEntry(null);
    }
    setSubmitting(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Financial Report', 14, 15);
    
    const tableData = entries.map(e => [
      format(new Date(e.date), 'dd/MM/yyyy'),
      e.type.toUpperCase(),
      e.category,
      e.source_destination,
      e.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }),
      e.description
    ]);

    autoTable(doc, {
      head: [['Date', 'Type', 'Category', 'From/To', 'Amount', 'Description']],
      body: tableData,
      startY: 20,
    });

    doc.save(`finance_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const totalIncome = entries.filter(e => e.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Mobile Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-100"
        >
          <div className="flex items-center gap-2 sm:gap-3 text-emerald-600 mb-1 sm:mb-2">
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg sm:rounded-xl">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-bold text-[10px] sm:text-sm">Income</span>
          </div>
          <p className="text-sm sm:text-2xl font-black text-emerald-900">
            IDR {formatCompactNumber(totalIncome)}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-rose-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-rose-100"
        >
          <div className="flex items-center gap-2 sm:gap-3 text-rose-600 mb-1 sm:mb-2">
            <div className="p-1.5 sm:p-2 bg-rose-100 rounded-lg sm:rounded-xl">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-bold text-[10px] sm:text-sm">Expense</span>
          </div>
          <p className="text-sm sm:text-2xl font-black text-rose-900">
            IDR {formatCompactNumber(totalExpense)}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-2 lg:col-span-1 bg-blue-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-blue-100"
        >
          <div className="flex items-center gap-2 sm:gap-3 text-blue-600 mb-1 sm:mb-2">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg sm:rounded-xl">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-bold text-[10px] sm:text-sm">Balance</span>
          </div>
          <p className="text-sm sm:text-2xl font-black text-blue-900">
            IDR {formatCompactNumber(balance)}
          </p>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-black text-slate-900">History</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportPDF}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all"
              title="Export PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-bold text-sm"
            >
              <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Entry List - Mobile Cards / Desktop Table */}
      <div className="space-y-4">
        {loading.finance && filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">Loading transactions...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
            {searchTerm ? 'No matches found.' : 'No transactions yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredEntries.map((entry, index) => (
              <motion.div 
                layout
                key={`${entry.id}-${index}`}
                onClick={() => setSelectedEntry(entry)}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${entry.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {entry.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{entry.source_destination}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-medium uppercase tracking-wider">{entry.category}</span>
                      <span>•</span>
                      <span>{format(new Date(entry.date), 'dd MMM')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(entry); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); confirmDelete(entry.id, entry.created_at); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <p className={`font-black text-sm sm:text-lg ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.type === 'income' ? '+' : '-'} {formatCompactNumber(entry.amount)}
                    </p>
                    {entry.location && (
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-300">
                        <MapPin className="w-3 h-3" /> Tagged
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{editingEntry ? 'Edit Transaction' : 'Add Transaction'}</h3>
                  <p className="text-slate-500 text-sm">{editingEntry ? 'Update the details below' : 'Fill in the details below'}</p>
                </div>
                <button onClick={() => { setShowForm(false); setEditingEntry(null); }} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewEntry({ ...newEntry, type: 'income' })}
                    className={`py-4 rounded-2xl font-black text-sm transition-all ${newEntry.type === 'income' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    INCOME
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEntry({ ...newEntry, type: 'expense' })}
                    className={`py-4 rounded-2xl font-black text-sm transition-all ${newEntry.type === 'expense' ? 'bg-rose-600 text-white shadow-xl shadow-rose-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    EXPENSE
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Amount (IDR)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input
                        type="text"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none text-xl font-black text-slate-900"
                        placeholder="0"
                        value={displayAmount}
                        onChange={handleAmountChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                        placeholder="e.g. Food"
                        value={newEntry.category}
                        onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">From/To</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                        placeholder="e.g. Store"
                        value={newEntry.source_destination}
                        onChange={(e) => setNewEntry({ ...newEntry, source_destination: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Receipt (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`w-full h-[56px] flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all ${newEntry.receipt_url ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      >
                        {uploading ? (
                          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        ) : newEntry.receipt_url ? (
                          <><ImageIcon className="w-5 h-5" /> Added</>
                        ) : (
                          <><Camera className="w-5 h-5" /> Upload</>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={ocrInputRef}
                        onChange={handleOCRUpload}
                      />
                      <button 
                        type="button"
                        onClick={() => ocrInputRef.current?.click()}
                        disabled={scanning}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {scanning ? (
                          <><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> SCANNING...</>
                        ) : (
                          <><Camera className="w-3 h-3" /> SCAN NOTA (OCR)</>
                        )}
                      </button>
                    </div>
                    <textarea
                      className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-bold resize-none"
                      rows={4}
                      placeholder="Add notes..."
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || submitting}
                  className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (editingEntry ? 'UPDATE TRANSACTION' : 'SAVE TRANSACTION')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900">Transaction Detail</h3>
                <button onClick={() => setSelectedEntry(null)} className="p-2 bg-slate-100 rounded-xl">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedEntry.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {selectedEntry.type === 'income' ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedEntry.category}</p>
                    <h4 className="text-xl font-black text-slate-900">{selectedEntry.source_destination}</h4>
                    {selectedEntry.location?.name && (
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">📍 {selectedEntry.location.name}</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                  <p className={`text-3xl font-black ${selectedEntry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedEntry.type === 'income' ? '+' : '-'} {selectedEntry.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                  </p>
                </div>

                {selectedEntry.description && (
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                    <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl">
                      {selectedEntry.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                      <Clock className="w-4 h-4" />
                      <span>{format(new Date(selectedEntry.date), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  {selectedEntry.phone_number && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                      <p className="text-sm text-slate-600 font-bold">{selectedEntry.phone_number}</p>
                    </div>
                  )}
                </div>

                {selectedEntry.receipt_url && (
                  <div className="flex flex-col gap-2">
                    <a 
                      href={selectedEntry.receipt_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center gap-2 font-black hover:bg-blue-100 transition-all"
                    >
                      <ImageIcon className="w-5 h-5" /> VIEW RECEIPT
                    </a>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedEntry.receipt_url;
                        link.download = `receipt_${selectedEntry.id}.png`;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center gap-2 font-black hover:bg-slate-200 transition-all"
                    >
                      <Download className="w-5 h-5" /> DOWNLOAD RECEIPT
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Delete Transaction?</h3>
              <p className="text-slate-500 text-sm mb-6">This action cannot be undone. Are you sure you want to remove this record?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
