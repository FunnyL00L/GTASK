import { UserConfig, FinanceEntry, TaskEntry } from '../types';

const LOCAL_STORAGE_KEY = 'gtaskflow_local_data';

interface LocalData {
  finance: FinanceEntry[];
  tasks: TaskEntry[];
  lastSync: string;
}

export const getLocalData = (): LocalData => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return { finance: [], tasks: [], lastSync: new Date().toISOString() };
};

export const saveLocalData = (data: Partial<LocalData>) => {
  const current = getLocalData();
  const updated = { ...current, ...data };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
};

export const callGAS = async (url: string, payload: any) => {
  if (!url || url === '') {
    // If no URL, handle locally
    return handleLocalAction(payload);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    
    // Sync with local storage for all get actions
    if (result.success) {
      if (payload.action === 'get_data') {
        saveLocalData({
          finance: result.finance,
          tasks: result.tasks,
          lastSync: new Date().toISOString()
        });
      } else if (payload.action === 'get_finance') {
        saveLocalData({ finance: result.finance, lastSync: new Date().toISOString() });
      } else if (payload.action === 'get_tasks') {
        saveLocalData({ tasks: result.tasks, lastSync: new Date().toISOString() });
      }
    }
    
    return result;
  } catch (error) {
    console.error('GAS API Error:', error);
    // Fallback to local for certain actions if API fails
    return handleLocalAction(payload);
  }
};

const handleLocalAction = (payload: any) => {
  const data = getLocalData();
  const action = payload.action;

  if (action === 'get_data') {
    return { success: true, finance: data.finance, tasks: data.tasks, isLocal: true };
  }

  if (action === 'add_finance') {
    const newEntry = { 
      ...payload, 
      id: Date.now().toString(),
      date: payload.date || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    saveLocalData({ finance: [newEntry, ...data.finance] });
    return { success: true, isLocal: true };
  }

  if (action === 'add_task') {
    const newTask = { 
      ...payload, 
      id: Date.now().toString(), 
      created_at: new Date().toISOString(),
      reminder_sent: false 
    };
    saveLocalData({ tasks: [newTask, ...data.tasks] });
    return { success: true, isLocal: true };
  }

  if (action === 'update_task') {
    const updatedTasks = data.tasks.map(t => 
      t.title === payload.title ? { ...t, status: payload.status || t.status, progress_image_url: payload.imageUrl || t.progress_image_url } : t
    );
    saveLocalData({ tasks: updatedTasks });
    return { success: true, isLocal: true };
  }

  if (action === 'save_config') {
    // Local config is already handled by state in App.tsx, 
    // but we return success to allow the UI to proceed.
    return { success: true, isLocal: true };
  }

  if (action === 'change_password') {
    return { success: false, message: 'Password change is only available in Cloud Mode', isLocal: true };
  }
};
