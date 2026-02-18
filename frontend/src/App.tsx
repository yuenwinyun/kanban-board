import { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { fetchTasks, saveTasks } from './api/tasks';
import type { BoardData, ColumnId, Task } from './types';
import './App.css';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function App() {
  const [data, setData] = useState<BoardData>({
    todo: [],
    progress: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);

  // Load tasks on mount
  useEffect(() => {
    fetchTasks()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Save tasks whenever data changes
  const persistData = useCallback(async (newData: BoardData) => {
    setData(newData);
    try {
      await saveTasks(newData);
    } catch (e) {
      console.error('Failed to save:', e);
    }
  }, []);

  const handleAddTask = (columnId: ColumnId, text: string) => {
    const task: Task = { id: uid(), text };
    persistData({
      ...data,
      [columnId]: [...data[columnId], task],
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const newData = { ...data };
    for (const col of Object.keys(newData) as ColumnId[]) {
      newData[col] = newData[col].filter((t) => t.id !== taskId);
    }
    persistData(newData);
  };

  const handleMoveTask = (
    taskId: string,
    fromCol: ColumnId,
    toCol: ColumnId,
    newIndex: number
  ) => {
    const task = data[fromCol].find((t) => t.id === taskId);
    if (!task) return;

    const newData = { ...data };
    // Remove from source
    newData[fromCol] = newData[fromCol].filter((t) => t.id !== taskId);
    // Add to destination at specific index
    newData[toCol] = [
      ...newData[toCol].slice(0, newIndex),
      task,
      ...newData[toCol].slice(newIndex),
    ];
    persistData(newData);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
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
