# Remote Storage Specification: Supabase

## Overview

Add real-time multi-user sync to the kanban board using Supabase (PostgreSQL + Realtime).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Kanban Board                         │
│  ┌───────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │  App.tsx  │─▶│ useTasks() │─▶│ useEffect (sync)      │   │
│  └───────────┘  └────────────┘  └──────────┬───────────┘   │
└─────────────────────────────────────────────┼───────────────┘
                                              │ REST
                                              │ Realtime
                                              ▼
                                    ┌───────────────────┐
                                    │    Supabase       │
                                    │  ┌─────────────┐  │
                                    │  │ tasks table │  │
                                    │  └─────────────┘  │
                                    └───────────────────┘
```

## Database Schema

```sql
-- Supabase SQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_id VARCHAR(20) NOT NULL DEFAULT 'todo',
  text TEXT NOT NULL,
  position FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Row Level Security (optional - for future auth)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (for now - tighten later)
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
```

## Position Strategy

Use **lexorank** or simple **float** for ordering:

```typescript
// When moving task to index N in a column:
// - Get tasks at N-1 and N
// - position = (prev.position + next.position) / 2

// Example:
// Task A at position 100, Task C at position 300
// Inserting Task B between them: position = (100 + 300) / 2 = 200
```

This avoids reordering all tasks on every move.

---

## Implementation Plan

### Phase 1: Setup (30 min)

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get URL + anon key from Settings → API
3. Run SQL below in Supabase SQL Editor
4. Copy `.env.example` to `.env` and add your credentials:

```bash
cp .env.example .env
# Then edit .env with your values
```

**SQL Schema (run in Supabase SQL Editor):**
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_id VARCHAR(20) NOT NULL DEFAULT 'todo',
  text TEXT NOT NULL,
  position FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (for now - tighten later)
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
```

### Phase 2: Client Integration (1 hr)

**New file: `src/api/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export type Task = {
  id: string;
  column_id: string;
  text: string;
  position: number;
  created_at: string;
  updated_at: string;
};
```

**Update: `src/api/tasks.ts`**
```typescript
import { supabase, type Task } from './supabase';

const defaultTasks: Task[] = [
  { id: 'mock-1', column_id: 'todo', text: 'Welcome to Kanban!', position: 0, created_at: '', updated_at: '' },
  // ...
];

export async function loadTasks(): Promise<BoardData> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position');
  
  if (error || !data) return defaultData;
  
  // Group by column_id
  return groupByColumn(data);
}

export async function saveTask(task: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .upsert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await supabase.from('tasks').delete().eq('id', id);
}
```

### Phase 3: Real-time Sync (1 hr)

**Update: `src/App.tsx`**
```typescript
import { useEffect } from 'react';
import { supabase } from './api/supabase';

function App() {
  const [data, setData] = useState<BoardData>(loadTasks);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        // Refresh on any change
        loadTasks().then(setData);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ... rest unchanged
}
```

### Phase 4: Optimistic Updates (Optional, 1 hr)

For better UX, update UI immediately before server responds:

```typescript
const handleMoveTask = async (...) => {
  // 1. Optimistic update
  const optimisticData = /* calculate new state */;
  setData(optimisticData);
  
  // 2. Server sync
  try {
    await updateTaskPosition(taskId, newPosition);
  } catch {
    // 3. Rollback on failure
    setData(previousData);
  }
};
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `.env` | Add Supabase credentials |
| `src/api/supabase.ts` | **NEW** - Supabase client |
| `src/api/tasks.ts` | **MODIFY** - Replace localStorage with Supabase |
| `src/App.tsx` | **MODIFY** - Add real-time subscription |
| `src/types.ts` | **MODIFY** - Update Task type for remote |

---

## Conflict Resolution

For MVP: **Last-write-wins** with `updated_at` timestamp.

Future upgrade path:
- CRDT with Yjs (`y-websocket` + `y-supabase`)
- Or optimistic UI with merge dialog

---

## OpenClaw Cron Integration

With Supabase, your OpenClaw cronjobs can access data via REST API:

### Example: Daily Task Summary Cron

```typescript
// In your OpenClaw cron job
const fetch = require('node-fetch'); // or use built-in fetch

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getTaskSummary() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/tasks?select=column_id`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      }
    }
  );
  
  const tasks = await response.json();
  
  const counts = tasks.reduce((acc, t) => {
    acc[t.column_id] = (acc[t.column_id] || 0) + 1;
    return acc;
  }, {});
  
  return `📋 Kanban Summary:
  • To Do: ${counts.todo || 0}
  • In Progress: ${counts.progress || 0}
  • Done: ${counts.done || 0}`;
}
```

### Environment Variables

Add to OpenClaw config or `.env`:
```
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Cron Job Setup (OpenClaw)

```javascript
// In your cron job config
{
  schedule: { kind: 'cron', expr: '0 9 * * *' }, // 9am daily
  payload: {
    kind: 'agentTurn',
    message: 'Run getTaskSummary() and send me the result'
  }
}
```

---

## Testing Checklist

- [ ] Create task → appears for all connected users
- [ ] Delete task → disappears for all
- [ ] Move task between columns → syncs
- [ ] Reorder within column → syncs
- [ ] Two users move same task → last write wins
- [ ] Offline changes → handle gracefully (queue or error)

---

## Dependencies

```bash
npm install @supabase/supabase-js
```

No other changes required — keep dnd-kit, React, etc.
