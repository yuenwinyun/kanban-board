import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Task, ColumnId, ColumnConfig } from '../../types';
import { Card } from '../Card/Card';
import { AddTaskForm } from '../AddTaskForm/AddTaskForm';
import './Column.css';

interface ColumnProps {
  config: ColumnConfig;
  tasks: Task[];
  onAdd: (columnId: ColumnId, text: string) => void;
  onDelete: (taskId: string) => void;
}

export function Column({ config, tasks, onAdd, onDelete }: ColumnProps) {
  const [showForm, setShowForm] = useState(false);

  const { setNodeRef } = useDroppable({
    id: config.id,
  });

  const handleSubmit = (text: string) => {
    onAdd(config.id, text);
    setShowForm(false);
  };

  return (
    <div className="column" data-col={config.id}>
      <div className="column-header">
        <div className="left">
          <span className="dot" style={{ background: config.color }} />
          <h2>{config.title}</h2>
          <span className="count">{tasks.length}</span>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          +
        </button>
      </div>

      <div className="task-list" ref={setNodeRef}>
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <Card key={task.id} task={task} onDelete={onDelete} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !showForm && (
          <div className="empty-state">No tasks yet</div>
        )}
      </div>

      {showForm && (
        <AddTaskForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
}
