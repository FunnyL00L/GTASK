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
  reminder_sent: boolean;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
}
