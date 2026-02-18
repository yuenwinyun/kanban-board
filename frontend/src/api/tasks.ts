import type { BoardData } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.50.218:8081';

export async function fetchTasks(): Promise<BoardData> {
  const res = await fetch(`${API_URL}/api/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function saveTasks(data: BoardData): Promise<void> {
  await fetch(`${API_URL}/api/tasks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
