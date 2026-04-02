import React, { useState, useEffect } from 'react';
import { UserConfig, TaskEntry, User } from '../types';
import { callGAS } from '../services/api';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon, 
  Send,
  MoreVertical,
  Calendar as CalendarIcon,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  CheckSquare,
  Square,
  Search,
  Edit2,
  Trash2
} from 'lucide-react';
import { format, isAfter, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, differenceInDays } from 'date-fns';

interface TasksProps {
  config: UserConfig;
  user: User;
}

export default function Tasks({ config, user }: TasksProps) {
  const { tasks, loading, addTask, updateTask, deleteTask } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskEntry | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'created'>('deadline');
  
  const [newTask, setNewTask] = useState<Partial<TaskEntry>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    deadline: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    recurrence_type: 'none',
    recurrence_interval: 1
  });

  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = tasks
    .filter(t => {
      const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPriority && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortBy === 'priority') {
        const pMap = { high: 0, medium: 1, low: 2 };
        return pMap[a.priority] - pMap[b.priority];
      }
      return new Date(b.id).getTime() - new Date(a.id).getTime(); // Assuming ID is row index or timestamp
    });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let success = false;
    if (editingTask) {
      success = await updateTask({
        id: editingTask.id,
        created_at: editingTask.created_at,
        ...newTask
      });
    } else {
      success = await addTask(newTask);
    }

    if (success) {
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        deadline: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        recurrence_type: 'none',
        recurrence_interval: 1
      });
      setShowForm(false);
      setEditingTask(null);
    }
    setSubmitting(false);
  };

  const [taskToDelete, setTaskToDelete] = useState<{id: string, title: string, created_at: string} | null>(null);

  const confirmDelete = (id: string, title: string, created_at: string) => {
    setTaskToDelete({ id, title, created_at });
  };

  const executeDelete = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete.id, taskToDelete.title, taskToDelete.created_at);
      setTaskToDelete(null);
    }
  };

  const startEdit = (task: TaskEntry) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: format(parseISO(task.deadline), "yyyy-MM-dd'T'HH:mm"),
      recurrence_type: task.recurrence_type || 'none',
      recurrence_interval: task.recurrence_interval || 1
    });
    setShowForm(true);
  };

  const updateStatus = async (id: string, status: TaskEntry['status']) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Handle recurrence logic if marking as done
    if (status === 'done' && task.recurrence_type && task.recurrence_type !== 'none') {
      // Fully done for this cycle, advance deadline
      let nextDate = new Date(task.deadline);
      const interval = task.recurrence_interval || 1;
      
      if (task.recurrence_type === 'daily') nextDate.setDate(nextDate.getDate() + interval);
      else if (task.recurrence_type === 'weekly') nextDate.setDate(nextDate.getDate() + (7 * interval));
      else if (task.recurrence_type === 'monthly') nextDate.setMonth(nextDate.getMonth() + interval);
      else if (task.recurrence_type === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + interval);

      // Create the next instance
      await addTask({
        title: task.title,
        description: task.description,
        status: 'todo',
        priority: task.priority,
        deadline: format(nextDate, "yyyy-MM-dd'T'HH:mm"),
        phone_number: task.phone_number,
        recurrence_type: task.recurrence_type,
        recurrence_interval: task.recurrence_interval
      });

      // Mark current instance as done and remove recurrence so it stays as a completed record
      await updateTask({
        id,
        created_at: task.created_at,
        status: 'done',
        completed_at: new Date().toISOString(),
        recurrence_type: 'none'
      });
      return;
    }

    const updates: Partial<TaskEntry> = { status };
    if (status === 'done') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'in_progress') {
      updates.completed_at = '';
    }
    await updateTask({ id, created_at: task.created_at, ...updates });
  };

  const toggleChecklistItem = async (task: TaskEntry, index: number) => {
    const lines = task.description.split('\n');
    const line = lines[index];
    
    if (line.startsWith('[ ]')) {
      lines[index] = line.replace('[ ]', '[x]');
    } else if (line.startsWith('[x]')) {
      lines[index] = line.replace('[x]', '[ ]');
    } else {
      return;
    }

    const newDescription = lines.join('\n');
    await updateTask({ id: task.id, created_at: task.created_at, description: newDescription });
  };

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !e.target.files?.[0]) return;

    setUploading(id);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const uploadRes = await callGAS(config.gasUrl, {
        action: 'upload_image',
        username: user.username,
        image: base64,
      });

      if (uploadRes.success) {
        await updateTask({
          id: task.id,
          created_at: task.created_at,
          status: 'done',
          completed_at: new Date().toISOString(),
          progress_image_url: uploadRes.url
        });
      }
      setUploading(null);
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const sendReminder = async (task: TaskEntry) => {
    if (!config.waNumber) {
      alert('Please set WhatsApp number in settings');
      return;
    }

    let message = `🔔 *TASK REMINDER*\n\nTask: ${task.title}\nDescription: ${task.description || '-'}\nDeadline: ${format(parseISO(task.deadline), 'dd MMM yyyy HH:mm')}\nPriority: ${task.priority.toUpperCase()}\n\nPlease complete this task soon!`;
    
    if (task.status === 'done' && task.progress_image_url) {
      message = `✅ *TASK COMPLETED*\n\nTask: ${task.title}\nDescription: ${task.description || '-'}\nStatus: COMPLETED\n\nView Proof: ${task.progress_image_url}`;
    }

    const waUrl = `https://wa.me/${config.waNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    await updateTask({
      id: task.id,
      created_at: task.created_at,
      reminder_sent: true
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Workflow</h2>
          <p className="text-slate-500 text-sm">Manage your daily tasks</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-1 flex">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          >
            <option value="deadline">By Deadline</option>
            <option value="priority">By Priority</option>
            <option value="created">By Newest</option>
          </select>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-900 text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={`${d}-${i}`} className="text-center text-[10px] font-black text-slate-300 uppercase py-2">{d}</div>
            ))}
            {calendarDays.map(day => {
              const dayTasks = filteredTasks.filter(t => isSameDay(parseISO(t.deadline), day));
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={day.toString()} 
                  className={`aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all ${isToday ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                >
                  <span className="text-xs font-bold">{format(day, 'd')}</span>
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayTasks.slice(0, 3).map((_, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-blue-500'}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {loading.tasks && filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
              No tasks found.
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const isOverdue = isAfter(new Date(), parseISO(task.deadline)) && task.status !== 'done';
              const descriptionLines = task.description.split('\n');
              
              return (
                <motion.div 
                  layout
                  key={`${task.id}-${index}`}
                  className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm group hover:border-slate-200 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        {task.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className={`font-black ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${getPriorityColor(task.priority)}`}>
                              {task.priority.toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-bold ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                              {format(parseISO(task.deadline), 'dd MMM, HH:mm')}
                            </span>
                          </div>
                          
                          {task.status !== 'done' && (
                            <div className="text-[10px] font-bold text-slate-400">
                              {(() => {
                                const daysLeft = differenceInDays(parseISO(task.deadline), new Date());
                                if (daysLeft > 0) return `${daysLeft} days left`;
                                if (daysLeft < 0) return <span className="text-rose-500">Overdue by {Math.abs(daysLeft)} days</span>;
                                return <span className="text-amber-500">Due today</span>;
                              })()}
                            </div>
                          )}
                          
                          {task.recurrence_type && task.recurrence_type !== 'none' && (
                            <div className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg w-fit">
                              Berulang: {task.recurrence_type}
                            </div>
                          )}

                          {task.status === 'done' && task.completed_at && (
                            <div className="text-[10px] font-bold">
                              {(() => {
                                const diff = differenceInDays(parseISO(task.deadline), parseISO(task.completed_at));
                                if (diff > 0) return <span className="text-emerald-500">Completed {diff} days early 🚀</span>;
                                if (diff < 0) return <span className="text-rose-500">Completed {Math.abs(diff)} days late 🐌</span>;
                                return <span className="text-blue-500">Completed on time 🎯</span>;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(task)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => confirmDelete(task.id, task.title, task.created_at)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => sendReminder(task)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 px-1">
                    {descriptionLines.map((line, idx) => {
                      if (line.startsWith('[ ]') || line.startsWith('[x]')) {
                        const isChecked = line.startsWith('[x]');
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 cursor-pointer group/item"
                            onClick={() => toggleChecklistItem(task, idx)}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 group-hover/item:text-slate-400" />
                            )}
                            <span className={`text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-600 font-medium'}`}>
                              {line.substring(3).trim()}
                            </span>
                          </div>
                        );
                      }
                      return <p key={idx} className="text-slate-500 text-sm">{line}</p>;
                    })}
                  </div>

                  {task.progress_image_url && task.status !== 'done' && (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100">
                      <img src={task.progress_image_url} alt="Progress" className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {task.status !== 'done' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateStatus(task.id, 'in_progress')}
                          className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all ${task.status === 'in_progress' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          IN PROGRESS
                        </button>
                        
                        {task.priority === 'low' && (
                          <button 
                            onClick={() => updateStatus(task.id, 'done')}
                            className="flex-1 py-3 rounded-2xl text-xs font-black bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                          >
                            FINISH
                          </button>
                        )}

                        {task.priority === 'medium' && (
                          <div className="flex-1 flex gap-1">
                            <button 
                              onClick={() => updateStatus(task.id, 'done')}
                              className="flex-1 py-3 rounded-2xl text-[10px] font-black bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                            >
                              FINISH
                            </button>
                            <label className="flex-1 py-3 rounded-2xl text-[10px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-center cursor-pointer flex items-center justify-center">
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(task.id, e)} />
                              {uploading === task.id ? '...' : '+ PROOF'}
                            </label>
                          </div>
                        )}

                        {task.priority === 'high' && (
                          <label className="flex-1 py-3 rounded-2xl text-xs font-black bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all text-center cursor-pointer">
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(task.id, e)} />
                            {uploading === task.id ? 'UPLOADING...' : 'UPLOAD PROOF TO FINISH'}
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-center text-xs font-black flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> COMPLETED
                        </div>
                        <div className="flex gap-2">
                          {task.progress_image_url && (
                            <a 
                              href={task.progress_image_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-center text-[10px] font-black hover:bg-blue-100 transition-all flex items-center justify-center gap-1"
                            >
                              <ImageIcon className="w-3 h-3" /> VIEW PROOF
                            </a>
                          )}
                          <button 
                            onClick={() => updateStatus(task.id, 'in_progress')}
                            className="flex-1 py-2 bg-rose-50 text-rose-600 rounded-xl text-center text-[10px] font-black hover:bg-rose-100 transition-all flex items-center justify-center gap-1"
                          >
                            <X className="w-3 h-3" /> REVERT
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Add Task Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                  <p className="text-slate-500 text-sm">{editingTask ? 'Update your workflow' : 'Organize your workflow'}</p>
                </div>
                <button onClick={() => { setShowForm(false); setEditingTask(null); }} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                      placeholder="What needs to be done?"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
                      <button 
                        type="button"
                        onClick={() => setNewTask({ ...newTask, description: (newTask.description || '') + (newTask.description ? '\n' : '') + '[ ] ' })}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700"
                      >
                        + ADD CHECKLIST ITEM
                      </button>
                    </div>
                    <textarea
                      className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-bold resize-none"
                      rows={5}
                      placeholder="Add more details... Use [ ] for checklist items."
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Priority</label>
                      <select
                        className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-bold appearance-none"
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Deadline</label>
                      <input
                        type="datetime-local"
                        required
                        className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                        value={newTask.deadline}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newTask.recurrence_type !== 'none'}
                        onChange={e => setNewTask({...newTask, recurrence_type: e.target.checked ? 'daily' : 'none'})}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-sm font-bold text-slate-700">Jadikan Kegiatan Berulang</span>
                    </label>

                    {newTask.recurrence_type && newTask.recurrence_type !== 'none' && (
                      <div className="space-y-4 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">TIPE PENGULANGAN</label>
                          <select
                            value={newTask.recurrence_type}
                            onChange={e => setNewTask({...newTask, recurrence_type: e.target.value as any})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-slate-900"
                          >
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="monthly">Bulanan</option>
                            <option value="yearly">Tahunan</option>
                          </select>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-2">SETIAP ... HARI/MINGGU</label>
                            <input
                              type="number"
                              min="1"
                              value={newTask.recurrence_interval}
                              onChange={e => setNewTask({...newTask, recurrence_interval: Number(e.target.value)})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (editingTask ? 'UPDATE TASK' : 'CREATE TASK')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete && (
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
              <h3 className="text-xl font-black text-slate-900 mb-2">Delete Task?</h3>
              <p className="text-slate-500 text-sm mb-6">Are you sure you want to delete "{taskToDelete.title}"? This cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTaskToDelete(null)}
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
