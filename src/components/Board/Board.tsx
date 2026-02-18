import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { Column } from '../Column/Column';
import { COLUMNS } from '../../types';
import type { ColumnId, BoardData } from '../../types';
import './Board.css';

interface BoardProps {
  data: BoardData;
  onMoveTask: (taskId: string, fromCol: ColumnId, toCol: ColumnId, newIndex: number) => void;
  onAddTask: (columnId: ColumnId, text: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function Board({ data, onMoveTask, onAddTask, onDeleteTask }: BoardProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which column the task moved from
    let fromCol: ColumnId | null = null;
    for (const col of COLUMNS) {
      if (data[col.id].find((t) => t.id === activeId)) {
        fromCol = col.id;
        break;
      }
    }
    if (!fromCol) return;

    // Determine target column
    let toCol: ColumnId = fromCol;
    let newIndex = 0;

    // Check if dropped on a column
    const isColumn = COLUMNS.find((c) => c.id === overId);
    if (isColumn) {
      toCol = isColumn.id;
      newIndex = data[toCol].length;
    } else {
      // Dropped on a task - find which column it's in
      for (const col of COLUMNS) {
        const taskIndex = data[col.id].findIndex((t) => t.id === overId);
        if (taskIndex !== -1) {
          toCol = col.id;
          newIndex = taskIndex;
          break;
        }
      }
    }

    const currentIndex = data[fromCol].findIndex((t) => t.id === activeId);

    if (fromCol !== toCol || currentIndex !== newIndex) {
      onMoveTask(activeId, fromCol, toCol, newIndex);
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="board">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            config={col}
            tasks={data[col.id]}
            onAdd={onAddTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
