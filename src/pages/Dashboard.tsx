import React from 'react';
import { UserConfig, User } from '../types';
import { useData } from '../contexts/DataContext';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isAfter, parseISO } from 'date-fns';

import { formatCompactNumber } from '../lib/utils';

interface DashboardProps {
  config: UserConfig;
  user: User;
}

export default function Dashboard({ config, user }: DashboardProps) {
  const { finance, tasks, loading } = useData();

  const finEntries = finance.slice(0, 5);
  const recentTasks = tasks.slice(0, 5);

  const totalIncome = finance.filter(e => e.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalExpense = finance.filter(e => e.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;

  if (loading.finance && loading.tasks && finance.length === 0 && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 font-medium">
        Loading overview...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Overview</h2>
          <p className="text-slate-500 text-sm">{format(new Date(), 'EEEE, dd MMM')}</p>
        </div>
        <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm">
          <Calendar className="w-6 h-6" />
        </div>
      </div>

      {/* Summary Cards - Grid on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="bg-emerald-500 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] text-white shadow-xl shadow-emerald-100"
        >
          <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 opacity-80" />
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">Income</p>
          <h3 className="text-sm sm:text-xl font-black mt-1">IDR {formatCompactNumber(totalIncome)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-rose-500 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] text-white shadow-xl shadow-rose-100"
        >
          <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 opacity-80" />
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">Expense</p>
          <h3 className="text-sm sm:text-xl font-black mt-1">IDR {formatCompactNumber(totalExpense)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.2 }}
          className="bg-blue-500 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] text-white shadow-xl shadow-blue-100"
        >
          <Clock className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 opacity-80" />
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">Tasks</p>
          <h3 className="text-sm sm:text-xl font-black mt-1">{pendingTasks} Pending</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.3 }}
          className="bg-slate-900 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] text-white shadow-xl shadow-slate-200"
        >
          <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 opacity-80" />
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">Done</p>
          <h3 className="text-sm sm:text-xl font-black mt-1">{tasks.filter(t => t.status === 'done').length} Done</h3>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <h3 className="font-black text-slate-900">Finance</h3>
            <Link to="/finance" className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {finEntries.length === 0 ? (
              <p className="text-center py-4 text-slate-400 text-sm">No recent transactions</p>
            ) : finEntries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${entry.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {entry.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{entry.source_destination}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{entry.category}</p>
                  </div>
                </div>
                <p className={`text-sm font-black ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {entry.type === 'income' ? '+' : '-'} {formatCompactNumber(entry.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <h3 className="font-black text-slate-900">Workflow</h3>
            <Link to="/tasks" className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {recentTasks.length === 0 ? (
              <p className="text-center py-4 text-slate-400 text-sm">No upcoming tasks</p>
            ) : recentTasks.map(task => {
              const isOverdue = isAfter(new Date(), parseISO(task.deadline)) && task.status !== 'done';
              return (
                <div key={task.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{task.title}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`}>
                        {format(parseISO(task.deadline), 'dd MMM, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                    task.priority === 'high' ? 'border-rose-100 text-rose-600 bg-rose-50' : 
                    task.priority === 'medium' ? 'border-amber-100 text-amber-600 bg-amber-50' : 'border-emerald-100 text-emerald-600 bg-emerald-50'
                  }`}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
