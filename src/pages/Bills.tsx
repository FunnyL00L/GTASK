import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../contexts/DataContext';
import { Plus, Edit2, Trash2, CheckCircle2, CalendarDays, Receipt, AlertCircle } from 'lucide-react';
import { format, isAfter, parseISO, setDate, isSameMonth } from 'date-fns';

export default function Bills() {
  const { bills, loading, addBill, updateBill, deleteBill, payBill } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  
  const [newBill, setNewBill] = useState({
    title: '',
    amount: 0,
    due_date: format(new Date(), 'yyyy-MM-dd'),
    recurrence_type: 'monthly' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  });

  const [displayAmount, setDisplayAmount] = useState('');

  const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatCurrency(val);
    setDisplayAmount(formatted);
    setNewBill({ ...newBill, amount: Number(formatted.replace(/\./g, '')) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBill) {
      await updateBill({ ...newBill, id: editingBill.id });
    } else {
      await addBill(newBill);
    }
    setShowForm(false);
    setEditingBill(null);
    setNewBill({ title: '', amount: 0, due_date: format(new Date(), 'yyyy-MM-dd'), recurrence_type: 'monthly' });
    setDisplayAmount('');
  };

  const startEdit = (bill: any) => {
    setEditingBill(bill);
    setNewBill({
      title: bill.title,
      amount: bill.amount,
      due_date: bill.due_date,
      recurrence_type: bill.recurrence_type || 'monthly'
    });
    setDisplayAmount(formatCurrency(bill.amount.toString()));
    setShowForm(true);
  };

  const currentMonthStr = new Date().toISOString().substring(0, 7);

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pengeluaran Rutin</h1>
          <p className="text-slate-500 mt-1">Kelola tagihan dan pengeluaran bulanan Anda</p>
        </div>
        <button
          onClick={() => {
            setEditingBill(null);
            setNewBill({ title: '', amount: 0, due_date: format(new Date(), 'yyyy-MM-dd'), recurrence_type: 'monthly' });
            setDisplayAmount('');
            setShowForm(true);
          }}
          className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {loading.bills ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-900"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {bills.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
              Belum ada pengeluaran rutin.
            </div>
          ) : (
            bills.map((bill) => {
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              const isPaid = bill.last_paid_date && bill.last_paid_date === todayStr && bill.recurrence_type === 'daily' 
                || (bill.last_paid_date && bill.recurrence_type !== 'daily' && isAfter(new Date(bill.due_date), new Date()));
              
              const isOverdue = isAfter(new Date(todayStr), new Date(bill.due_date)) && !isPaid;

              const recurrenceLabels: Record<string, string> = {
                'none': 'Sekali',
                'daily': 'Harian',
                'weekly': 'Mingguan',
                'monthly': 'Bulanan',
                'yearly': 'Tahunan'
              };

              return (
                <motion.div 
                  layout
                  key={bill.id}
                  className={`p-5 rounded-[32px] border shadow-sm transition-all ${isPaid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">{bill.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-bold text-slate-700">
                            Rp {bill.amount.toLocaleString('id-ID')}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {format(new Date(bill.due_date), 'dd MMM yyyy')} ({recurrenceLabels[bill.recurrence_type || 'none']})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(bill)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => deleteBill(bill.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100/50 flex items-center justify-between">
                    <div>
                      {isPaid ? (
                        <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Lunas
                        </span>
                      ) : (
                        <span className={`text-sm font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                          <AlertCircle className="w-4 h-4" /> {isOverdue ? 'Jatuh Tempo!' : 'Belum dibayar'}
                        </span>
                      )}
                    </div>
                    
                    {!isPaid && (
                      <button 
                        onClick={() => payBill(bill.id, bill.amount, bill.title, bill.due_date, bill.recurrence_type)}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
                      >
                        BAYAR SEKARANG
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full sm:w-[400px] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">
                  {editingBill ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  Tutup
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">NAMA PENGELUARAN</label>
                  <input
                    type="text"
                    required
                    value={newBill.title}
                    onChange={e => setNewBill({...newBill, title: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900"
                    placeholder="Contoh: Listrik, Internet, Kos"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">NOMINAL (RP)</label>
                  <input
                    type="text"
                    required
                    value={displayAmount}
                    onChange={handleAmountChange}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">TANGGAL JATUH TEMPO</label>
                  <input
                    type="date"
                    required
                    value={newBill.due_date}
                    onChange={e => setNewBill({...newBill, due_date: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">PENGULANGAN</label>
                  <select
                    value={newBill.recurrence_type}
                    onChange={e => setNewBill({...newBill, recurrence_type: e.target.value as any})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="none">Sekali Saja</option>
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all mt-6"
                >
                  {editingBill ? 'SIMPAN PERUBAHAN' : 'TAMBAH PENGELUARAN'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
