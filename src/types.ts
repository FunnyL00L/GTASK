export interface UserConfig {
  gasUrl: string;
  waNumber?: string;
}

export interface User {
  name: string;
  username: string;
  phone_number?: string;
  config: UserConfig;
}

export interface FinanceEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  source_destination: string;
  description: string;
  phone_number?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  receipt_url?: string;
  created_at: string;
}

export interface TaskEntry {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  phone_number?: string;
  progress_image_url?: string;
  created_at: string;
  completed_at?: string;
  reminder_sent: boolean;
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_interval?: number;
}

export interface BillEntry {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  last_paid_date: string;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  created_at: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
}
