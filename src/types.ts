import type { ColumnId } from './api/supabase';

export type { Task, ColumnId, BoardData } from './api/supabase';

export interface ColumnConfig {
  id: ColumnId;
  title: string;
  color: string;
}

export const COLUMNS: ColumnConfig[] = [
  { id: 'todo', title: 'To Do', color: '#da3633' },
  { id: 'progress', title: 'In Progress', color: '#d29922' },
  { id: 'done', title: 'Done', color: '#238636' },
];
