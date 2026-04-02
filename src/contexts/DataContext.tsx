import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FinanceEntry, TaskEntry, BillEntry, User, UserConfig } from '../types';
import { callGAS, getLocalData, saveLocalData } from '../services/api';
import { useNotification } from './NotificationContext';

interface DataContextType {
  finance: FinanceEntry[];
  tasks: TaskEntry[];
  bills: BillEntry[];
  loading: {
    finance: boolean;
    tasks: boolean;
    bills: boolean;
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
  addBill: (bill: Partial<BillEntry>) => Promise<boolean>;
  updateBill: (bill: Partial<BillEntry> & { id: string }) => Promise<boolean>;
  deleteBill: (id: string) => Promise<boolean>;
  payBill: (id: string, amount: number, title: string, currentDueDate: string, recurrence: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children, user }: { children: React.ReactNode, user: User | null }) {
  const localData = getLocalData();
  const [finance, setFinance] = useState<FinanceEntry[]>(localData.finance || []);
  const [tasks, setTasks] = useState<TaskEntry[]>(localData.tasks || []);
  const [bills, setBills] = useState<BillEntry[]>(localData.bills || []);
  const [loading, setLoading] = useState({ finance: false, tasks: false, bills: false });
  const { showNotification } = useNotification();

  // Update state if local storage changes (e.g. on mount or after login)
  useEffect(() => {
    const data = getLocalData();
    if (data.finance.length > 0) setFinance(data.finance);
    if (data.tasks.length > 0) setTasks(data.tasks);
    if (data.bills && data.bills.length > 0) setBills(data.bills);
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
    const hasData = finance.length > 0 || tasks.length > 0 || bills.length > 0;
    if (!hasData) setLoading({ finance: true, tasks: true, bills: true });
    
    const result = await callGAS(user.config.gasUrl, {
      action: 'get_data',
      username: user.username
    });
    if (result.success) {
      setFinance(result.finance);
      setTasks(result.tasks);
      setBills(result.bills || []);
      saveLocalData({ finance: result.finance, tasks: result.tasks, bills: result.bills || [] });
    }
    setLoading({ finance: false, tasks: false, bills: false });
  }, [user, finance.length, tasks.length, bills.length]);

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

  // Optimistic Bill Methods
  const addBill = async (bill: Partial<BillEntry>) => {
    if (!user) return false;
    const newId = Date.now().toString();
    const newBill = { ...bill, id: newId, created_at: new Date().toISOString(), last_paid_date: bill.last_paid_date || '' } as BillEntry;
    
    const updatedBills = [newBill, ...bills];
    setBills(updatedBills);
    saveLocalData({ bills: updatedBills });

    callGAS(user.config.gasUrl, {
      action: 'add_bill',
      username: user.username,
      ...newBill
    }).then(res => {
      if (!res.success) showNotification('Failed to sync bill', 'error');
    });
    return true;
  };

  const updateBill = async (bill: Partial<BillEntry> & { id: string }) => {
    if (!user) return false;
    const updatedBills = bills.map(b => b.id === bill.id ? { ...b, ...bill } : b);
    setBills(updatedBills);
    saveLocalData({ bills: updatedBills });

    callGAS(user.config.gasUrl, {
      action: 'update_bill',
      username: user.username,
      ...bill
    }).then(res => {
      if (!res.success) showNotification('Failed to update bill', 'error');
    });
    return true;
  };

  const deleteBill = async (id: string) => {
    if (!user) return false;
    const updatedBills = bills.filter(b => b.id !== id);
    setBills(updatedBills);
    saveLocalData({ bills: updatedBills });

    callGAS(user.config.gasUrl, {
      action: 'delete_bill',
      username: user.username,
      id
    }).then(res => {
      if (!res.success) showNotification('Failed to delete bill', 'error');
    });
    return true;
  };

  const payBill = async (id: string, amount: number, title: string, currentDueDate: string, recurrence: string) => {
    if (!user) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Calculate next due date
    let nextDate = new Date(currentDueDate);
    if (recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    else if (recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
    
    const nextDueDateStr = recurrence !== 'none' ? nextDate.toISOString().split('T')[0] : currentDueDate;

    // Update local bill
    const updatedBills = bills.map(b => b.id === id ? { ...b, last_paid_date: todayStr, due_date: nextDueDateStr } : b);
    setBills(updatedBills);
    
    // Add local finance
    const newFinance = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'expense' as const,
      amount,
      category: 'Bills',
      source_destination: 'Cash',
      description: `Pembayaran ${title}`,
      created_at: new Date().toISOString()
    };
    const updatedFinance = [newFinance, ...finance];
    setFinance(updatedFinance);
    
    saveLocalData({ bills: updatedBills, finance: updatedFinance });

    callGAS(user.config.gasUrl, {
      action: 'pay_bill',
      username: user.username,
      id,
      last_paid_date: todayStr,
      next_due_date: nextDueDateStr,
      amount,
      title,
      date: new Date().toISOString()
    }).then(res => {
      if (res.success) {
        showNotification('Bill paid and recorded to Finance', 'success');
      } else {
        showNotification('Failed to sync bill payment', 'error');
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
      finance, tasks, bills, loading, refreshFinance, refreshTasks, refreshAll,
      addTask, updateTask, deleteTask,
      addFinance, updateFinance, deleteFinance,
      addBill, updateBill, deleteBill, payBill
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
