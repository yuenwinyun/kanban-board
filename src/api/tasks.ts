import { supabase, type BoardData, type Task, type ColumnId } from './supabase';

const emptyData: BoardData = {
  todo: [],
  progress: [],
  done: [],
};

function groupByColumn(tasks: Task[]): BoardData {
  const result: BoardData = {
    todo: [],
    progress: [],
    done: [],
  };

  for (const task of tasks) {
    const col = task.column_id as ColumnId;
    if (result[col]) {
      result[col].push(task);
    }
  }

  // Sort each column by position
  for (const col of Object.keys(result) as ColumnId[]) {
    result[col].sort((a, b) => a.position - b.position);
  }

  return result;
}

export async function loadTasks(): Promise<BoardData> {
  // If Supabase is not configured, return empty data
  if (!supabase) {
    console.warn('Supabase not configured, using empty data');
    return emptyData;
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position');

  if (error) {
    console.error('Failed to load tasks:', error);
    return emptyData;
  }

  if (!data || data.length === 0) {
    return emptyData;
  }

  return groupByColumn(data);
}

export async function saveTasks(_data: BoardData): Promise<void> {
  // Individual task saves are handled by the CRUD functions below
  // This is kept for API compatibility
}

export async function addTask(columnId: ColumnId, text: string): Promise<Task> {
  if (!supabase) throw new Error('Supabase not configured');

  // Get the highest position in the column
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('column_id', columnId)
    .order('position', { ascending: false })
    .limit(1);

  const newPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      column_id: columnId,
      text,
      position: newPosition,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTaskPosition(
  taskId: string,
  columnId: ColumnId,
  newIndex: number
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  // Get all tasks in the target column
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, position')
    .eq('column_id', columnId)
    .order('position');

  if (!tasks) return;

  // Calculate new position
  let newPosition: number;
  if (newIndex === 0) {
    // Moving to first position
    newPosition = (tasks[0]?.position || 0) - 1;
  } else if (newIndex >= tasks.length) {
    // Moving to last position
    newPosition = (tasks[tasks.length - 1]?.position || 0) + 1;
  } else {
    // Moving to middle - average of neighbors
    const prevPos = tasks[newIndex - 1]?.position || 0;
    const nextPos = tasks[newIndex]?.position || prevPos + 2;
    newPosition = (prevPos + nextPos) / 2;
  }

  const { error } = await supabase
    .from('tasks')
    .update({ column_id: columnId, position: newPosition, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}

// Keep these for API compatibility (no-op)
export async function fetchTasks(): Promise<BoardData> {
  return loadTasks();
}

export async function saveTasksAsync(_data: BoardData): Promise<void> {
  // Individual task saves are handled by addTask/updateTaskPosition
}
