import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FinanceEntry, TaskEntry, User, UserConfig } from '../types';
import { callGAS, getLocalData, saveLocalData } from '../services/api';
import { useNotification } from './NotificationContext';

interface DataContextType {
  finance: FinanceEntry[];
  tasks: TaskEntry[];
  loading: {
    finance: boolean;
    tasks: boolean;
  };
  refreshFinance: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshAll: () => Promise<void>;
  // Optimistic methods
  addTask: (task: Partial<TaskEntry>) => Promise<boolean>;
  updateTask: (task: Partial<TaskEntry> & { id: string, created_at: string }) => Promise<boolean>;
  deleteTask: (id: string, title: string, created_at: string) => Promise<boolean>;
  addFinance: (entry: Partial<FinanceEntry>) => Promise<boolean>;
  updateFinance: (entry: Partial<FinanceEntry> & { id: string, created_at: string }) => Promise<boolean>;
  deleteFinance: (id: string, created_at: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children, user }: { children: React.ReactNode, user: User | null }) {
  const localData = getLocalData();
  const [finance, setFinance] = useState<FinanceEntry[]>(localData.finance || []);
  const [tasks, setTasks] = useState<TaskEntry[]>(localData.tasks || []);
  const [loading, setLoading] = useState({ finance: false, tasks: false });
  const { showNotification } = useNotification();

  // Update state if local storage changes (e.g. on mount or after login)
  useEffect(() => {
    const data = getLocalData();
    if (data.finance.length > 0) setFinance(data.finance);
    if (data.tasks.length > 0) setTasks(data.tasks);
  }, [user]);

  const refreshFinance = useCallback(async () => {
    if (!user) return;
    setLoading(prev => ({ ...prev, finance: true }));
    const result = await callGAS(user.config.gasUrl, {
      action: 'get_finance',
      username: user.username
    });
    if (result.success) {
      setFinance(result.finance);
      saveLocalData({ finance: result.finance });
    }
    setLoading(prev => ({ ...prev, finance: false }));
  }, [user]);

  const refreshTasks = useCallback(async () => {
    if (!user) return;
    setLoading(prev => ({ ...prev, tasks: true }));
    const result = await callGAS(user.config.gasUrl, {
      action: 'get_tasks',
      username: user.username
    });
    if (result.success) {
      setTasks(result.tasks);
      saveLocalData({ tasks: result.tasks });
    }
    setLoading(prev => ({ ...prev, tasks: false }));
  }, [user]);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    const hasData = finance.length > 0 || tasks.length > 0;
    if (!hasData) setLoading({ finance: true, tasks: true });
    
    const result = await callGAS(user.config.gasUrl, {
      action: 'get_data',
      username: user.username
    });
    if (result.success) {
      setFinance(result.finance);
      setTasks(result.tasks);
      saveLocalData({ finance: result.finance, tasks: result.tasks });
    }
    setLoading({ finance: false, tasks: false });
  }, [user, finance.length, tasks.length]);

  // Optimistic Task Methods
  const addTask = async (task: Partial<TaskEntry>) => {
    if (!user) return false;
    const newId = Date.now().toString();
    const createdAt = new Date().toISOString();
    const newTask = { ...task, id: newId, created_at: createdAt, status: task.status || 'todo', priority: task.priority || 'medium' } as TaskEntry;
    
    // Update Local
    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    saveLocalData({ tasks: updatedTasks });

    // Background Sync
    callGAS(user.config.gasUrl, {
      action: 'add_task',
      username: user.username,
      phone_number: user.phone_number,
      created_at: createdAt,
      ...task
    }).then(res => {
      if (res.success) {
        showNotification('Task successfully uploaded to cloud', 'success');
        refreshTasks(); // Get the real ID from server
      } else {
        showNotification('Failed to sync task: ' + res.message, 'error');
      }
    });

    return true;
  };

  const updateTask = async (task: Partial<TaskEntry> & { id: string, created_at: string }) => {
    if (!user) return false;
    
    // Update Local
    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, ...task } : t);
    setTasks(updatedTasks);
    saveLocalData({ tasks: updatedTasks });

    // Background Sync
    callGAS(user.config.gasUrl, {
      action: 'update_task',
      username: user.username,
      created_at: task.created_at,
      imageUrl: task.progress_image_url,
      ...task
    }).then(res => {
      if (res.success) {
        showNotification('Task update synced to cloud', 'success');
      } else {
        if (res.message === 'Unknown action') {
          showNotification('Disimpan lokal. Update Google Script untuk sync cloud.', 'warning');
        } else {
          showNotification('Failed to sync update: ' + res.message, 'error');
        }
      }
    });

    return true;
  };

  const deleteTask = async (id: string, title: string, created_at: string) => {
    if (!user) return false;
    
    // Update Local
    const updatedTasks = tasks.filter(t => t.id !== id);
    setTasks(updatedTasks);
    saveLocalData({ tasks: updatedTasks });

    // Background Sync
    callGAS(user.config.gasUrl, {
      action: 'delete_task',
      username: user.username,
      id,
      title,
      created_at
    }).then(res => {
      if (res.success) {
        showNotification('Task deleted from cloud', 'success');
      } else {
        if (res.message === 'Unknown action') {
          showNotification('Dihapus lokal. Update Google Script untuk sync cloud.', 'warning');
        } else {
          showNotification('Failed to delete from cloud: ' + res.message, 'error');
        }
      }
    });

    return true;
  };

  // Optimistic Finance Methods
  const addFinance = async (entry: Partial<FinanceEntry>) => {
    if (!user) return false;
    const newId = Date.now().toString();
    const createdAt = new Date().toISOString();
    const newEntry = { ...entry, id: newId, created_at: createdAt } as FinanceEntry;
    
    // Update Local
    const updatedFinance = [newEntry, ...finance];
    setFinance(updatedFinance);
    saveLocalData({ finance: updatedFinance });

    // Background Sync
    callGAS(user.config.gasUrl, {
      action: 'add_finance',
      username: user.username,
      phone_number: user.phone_number,
      created_at: createdAt,
      source: entry.source_destination,
      receiptUrl: entry.receipt_url,
      ...entry
    }).then(res => {
      if (res.success) {
        showNotification('Transaction synced to cloud', 'success');
        refreshFinance(); // Get real ID
      } else {
        showNotification('Failed to sync transaction: ' + res.message, 'error');
      }
    });

    return true;
  };

  const updateFinance = async (entry: Partial<FinanceEntry> & { id: string, created_at: string }) => {
    if (!user) return false;
    
    // Update Local
    const updatedFinance = finance.map(f => f.id === entry.id ? { ...f, ...entry } : f);
    setFinance(updatedFinance);
    saveLocalData({ finance: updatedFinance });

    // Background Sync
    callGAS(user.config.gasUrl, {
      action: 'update_finance',
      username: user.username,
      created_at: entry.created_at,
      source: entry.source_destination,
      ...entry
    }).then(res => {
      if (res.success) {
        showNotification('Transaction update synced', 'success');
      } else {
        if (res.message === 'Unknown action') {
          showNotification('Disimpan lokal. Update Google Script untuk sync cloud.', 'warning');
        } else {
          showNotification('Failed to sync update: ' + res.message, 'error');
        }
      }
    });

    return true;
  };

  const deleteFinance = async (id: string, created_at: string) => {
    if (!user) return false;
    
    // Update Local
    const updatedFinance = finance.filter(f => f.id !== id);
    setFinance(updatedFinance);
    saveLocalData({ finance: updatedFinance });

    // Background Sync
    callGAS(user.config.gasUrl, {
      action: 'delete_finance',
      username: user.username,
      id,
      created_at
    }).then(res => {
      if (res.success) {
        showNotification('Transaction deleted from cloud', 'success');
      } else {
        if (res.message === 'Unknown action') {
          showNotification('Dihapus lokal. Update Google Script untuk sync cloud.', 'warning');
        } else {
          showNotification('Failed to delete from cloud: ' + res.message, 'error');
        }
      }
    });

    return true;
  };

  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user, refreshAll]);

  return (
    <DataContext.Provider value={{ 
      finance, tasks, loading, refreshFinance, refreshTasks, refreshAll,
      addTask, updateTask, deleteTask,
      addFinance, updateFinance, deleteFinance
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
