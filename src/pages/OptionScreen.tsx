import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, ListTodo, LogOut, Settings, User as UserIcon, LayoutDashboard, Activity, Send, X, Clock, AlertCircle, Receipt } from 'lucide-react';
import { User as UserType, TaskEntry } from '../types';
import { callGAS } from '../services/api';
import { format, parseISO } from 'date-fns';

interface OptionScreenProps {
  user: UserType;
  onLogout: () => void;
}

export default function OptionScreen({ user, onLogout }: OptionScreenProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [showTaskSummary, setShowTaskSummary] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      const result = await callGAS(user.config.gasUrl, {
        action: 'get_data',
        username: user.username
      });
      if (result.success) setTasks(result.tasks);
    };
    fetchTasks();
  }, [user.config.gasUrl, user.username]);

  const pendingTasks = tasks.filter(t => t.status !== 'done');

  const sendTaskListToWA = () => {
    if (!user.config.waNumber) {
      alert('Please set WhatsApp number in settings first');
      return;
    }

    if (pendingTasks.length === 0) {
      alert('No pending tasks to send!');
      return;
    }

    let message = `📋 *GTASKFLOW: PENDING TASKS*\n\n`;
    pendingTasks.forEach((t, i) => {
      message += `${i + 1}. *${t.title}*\n   Deadline: ${format(parseISO(t.deadline), 'dd MMM, HH:mm')}\n   Priority: ${t.priority.toUpperCase()}\n\n`;
    });
    message += `_Keep going! You can do it!_`;

    const waUrl = `https://wa.me/${user.config.waNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const options = [
    {
      title: 'Finance',
      description: 'Track income & expenses',
      icon: Wallet,
      color: 'bg-emerald-500',
      path: '/finance',
    },
    {
      title: 'Workflow',
      description: 'Manage tasks & deadlines',
      icon: ListTodo,
      color: 'bg-blue-500',
      path: '/tasks',
    },
    {
      title: 'Overview',
      description: 'Quick dashboard view',
      icon: LayoutDashboard,
      color: 'bg-slate-900',
      path: '/dashboard',
    },
    {
      title: 'Analysis',
      description: 'Performance insights',
      icon: Activity,
      color: 'bg-purple-500',
      path: '/analysis',
    },
    {
      title: 'Bills',
      description: 'Manage recurring bills',
      icon: Receipt,
      color: 'bg-rose-500',
      path: '/bills',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-xl shadow-slate-200 mx-auto mb-6 border border-slate-100">
          <UserIcon className="w-12 h-12 text-slate-900" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hi, {user.name}!</h1>
        <p className="text-slate-500 mt-2 font-medium">What are we managing today?</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {options.map((option, index) => (
          <motion.button
            key={option.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(option.path)}
            className="group bg-white p-6 rounded-[40px] shadow-sm border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all text-center flex flex-col items-center justify-center aspect-square"
          >
            <div className={`w-16 h-16 ${option.color} rounded-[24px] flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
              <option.icon className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-slate-900">{option.title}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{option.description}</p>
          </motion.button>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => setShowTaskSummary(true)}
        className="mt-8 flex items-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-[24px] font-black hover:bg-emerald-100 transition-all border border-emerald-100"
      >
        <Send className="w-5 h-5" />
        SEND TASK LIST TO WA
      </motion.button>

      <AnimatePresence>
        {showTaskSummary && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900">Pending Tasks</h3>
                <button onClick={() => setShowTaskSummary(false)} className="p-2 bg-slate-100 rounded-xl">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6 pr-2">
                {pendingTasks.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold py-8">No pending tasks!</p>
                ) : (
                  pendingTasks.map((t, index) => (
                    <div key={`${t.id}-${index}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-black text-slate-900">{t.title}</h4>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-white rounded-lg border border-slate-200 uppercase">{t.priority}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(t.deadline), 'dd MMM, HH:mm')}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={sendTaskListToWA}
                className="w-full bg-emerald-600 text-white py-5 rounded-[24px] font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
              >
                <Send className="w-6 h-6" />
                SEND TO WHATSAPP
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mt-12 flex gap-4">
        <button
          onClick={() => navigate('/config')}
          className="p-4 bg-white text-slate-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"
        >
          <Settings className="w-6 h-6" />
        </button>
        <button
          onClick={onLogout}
          className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
