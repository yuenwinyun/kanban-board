import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { loadTasks, addTask, updateTaskPosition, deleteTask } from './api/tasks';
import { supabase } from './api/supabase';
import type { BoardData, ColumnId } from './api/supabase';
import './App.css';

function App() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    loadTasks().then((tasks) => {
      setData(tasks);
      setLoading(false);
    });
  }, []);

  // Real-time subscription
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        // Refresh on any change
        loadTasks().then(setData);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  const persistData = useCallback((newData: BoardData) => {
    setData(newData);
  }, []);

  const handleAddTask = async (columnId: ColumnId, text: string) => {
    if (!data) return;
    
    try {
      const newTask = await addTask(columnId, text);
      const newData = {
        ...data,
        [columnId]: [...data[columnId], newTask],
      };
      persistData(newData);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!data) return;

    try {
      await deleteTask(taskId);
      const newData = { ...data };
      for (const col of Object.keys(newData) as ColumnId[]) {
        newData[col] = newData[col].filter((t) => t.id !== taskId);
      }
      persistData(newData);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleMoveTask = async (
    taskId: string,
    fromCol: ColumnId,
    toCol: ColumnId,
    newIndex: number
  ) => {
    if (!data) return;

    // Optimistic update
    const task = data[fromCol].find((t) => t.id === taskId);
    if (!task) return;

    const newData = { ...data };
    // Remove from source
    newData[fromCol] = newData[fromCol].filter((t) => t.id !== taskId);
    // Add to destination at specific index
    newData[toCol] = [
      ...newData[toCol].slice(0, newIndex),
      { ...task, column_id: toCol },
      ...newData[toCol].slice(newIndex),
    ];
    persistData(newData);

    // Server sync
    try {
      await updateTaskPosition(taskId, toCol, newIndex);
    } catch (error) {
      console.error('Failed to move task:', error);
      // Reload on error to get correct state
      loadTasks().then(setData);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!data) {
    return <div className="error">Failed to load tasks</div>;
  }

  return (
    <>
      <Header />
      <Board
        data={data}
        onMoveTask={handleMoveTask}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
      />
    </>
  );
}

export default App;
