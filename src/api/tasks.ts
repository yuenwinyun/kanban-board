import type { BoardData } from '../types';

const STORAGE_KEY = 'kanban-board-data';

const defaultData: BoardData = {
  todo: [
    { id: 'mock-1', text: 'Welcome to Kanban! 🎉' },
    { id: 'mock-2', text: 'Click + to add a task' },
    { id: 'mock-3', text: 'Drag tasks between columns' },
  ],
  progress: [
    { id: 'mock-4', text: 'This is a task in progress' },
  ],
  done: [
    { id: 'mock-5', text: 'Completed task example' },
  ],
};

export function loadTasks(): BoardData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultData;
  try {
    return JSON.parse(stored) as BoardData;
  } catch {
    return defaultData;
  }
}

export function saveTasks(data: BoardData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Keep these for API compatibility (no-op)
export async function fetchTasks(): Promise<BoardData> {
  return loadTasks();
}

export async function saveTasksAsync(data: BoardData): Promise<void> {
  saveTasks(data);
}
