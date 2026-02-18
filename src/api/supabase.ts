import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create client only if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface Task {
  id: string;
  column_id: string;
  text: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export type ColumnId = 'todo' | 'progress' | 'done';

export type BoardData = Record<ColumnId, Task[]>;
