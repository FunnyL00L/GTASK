import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FinanceEntry, TaskEntry, User, UserConfig } from '../types';
import { callGAS, getLocalData } from '../services/api';

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children, user }: { children: React.ReactNode, user: User | null }) {
  const localData = getLocalData();
  const [finance, setFinance] = useState<FinanceEntry[]>(localData.finance || []);
  const [tasks, setTasks] = useState<TaskEntry[]>(localData.tasks || []);
  const [loading, setLoading] = useState({ finance: false, tasks: false });

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
    }
    setLoading(prev => ({ ...prev, tasks: false }));
  }, [user]);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    // Don't set loading to true if we already have local data to avoid flickering
    const hasData = finance.length > 0 || tasks.length > 0;
    if (!hasData) setLoading({ finance: true, tasks: true });
    
    const result = await callGAS(user.config.gasUrl, {
      action: 'get_data',
      username: user.username
    });
    if (result.success) {
      setFinance(result.finance);
      setTasks(result.tasks);
    }
    setLoading({ finance: false, tasks: false });
  }, [user, finance.length, tasks.length]);

  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user, refreshAll]);

  return (
    <DataContext.Provider value={{ finance, tasks, loading, refreshFinance, refreshTasks, refreshAll }}>
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
