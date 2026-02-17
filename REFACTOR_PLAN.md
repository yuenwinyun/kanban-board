# Kanban Board Refactoring Plan

## Current State

- **`index.html`** — Single-file frontend: inline CSS + JS, vanilla DOM manipulation, HTML5 drag-and-drop, fetches from a Python API
- **`server.py`** — Minimal Python HTTP server with two endpoints (`GET /api/tasks`, `PUT /api/tasks`), persists to `memory/kanban.json`
- Data model: `{ todo: Task[], progress: Task[], done: Task[] }` where `Task = { id: string, text: string }`

### Key observations

- The API is a bulk read/write — the entire board state is sent/received as one blob
- No authentication, no validation, no individual task CRUD
- The backend uses Python's built-in `http.server` (no framework)
- Frontend hardcodes the API URL to `192.168.50.218:8081`

---

## 1. Tech Stack

| Layer | Current | Proposed |
|-------|---------|----------|
| Frontend | Vanilla HTML/CSS/JS | **React 18 + TypeScript** |
| Build tool | None | **Vite** (fast HMR, TS support out of the box) |
| Styling | Inline `<style>` | **CSS Modules** (keeps scoping, zero runtime, easy migration from existing CSS) |
| Drag & drop | Native HTML5 DnD | **@dnd-kit/core + @dnd-kit/sortable** (accessible, React-friendly, lightweight) |
| Backend | `http.server` | **FastAPI** (automatic OpenAPI docs, validation, CORS middleware, async) |
| Data | JSON file | **JSON file** (keep as-is for now; FastAPI makes a future SQLite/Postgres swap trivial) |
| Linting | None | **ESLint + typescript-eslint** |
| Package manager | None | **npm** |

### Why these choices

- **Vite** over CRA/Next: No SSR needed, fastest dev server, first-class TS support.
- **CSS Modules** over Tailwind/styled-components: The existing CSS is well-structured and can be migrated almost 1:1 into `.module.css` files with no new syntax to learn.
- **@dnd-kit** over react-beautiful-dnd: react-beautiful-dnd is unmaintained. dnd-kit is actively maintained, smaller, and supports sortable lists natively.
- **FastAPI** over Flask/Express: Stays in Python (familiar), adds request validation via Pydantic, auto-generates OpenAPI docs, built-in CORS.

---

## 2. Project Structure

```
kanban-board/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx                  # Entry point, renders <App />
│       ├── App.tsx                   # Board layout, data fetching
│       ├── types.ts                  # Shared types (Task, Column, etc.)
│       ├── api/
│       │   └── tasks.ts             # API client (fetchTasks, saveTasks, etc.)
│       ├── components/
│       │   ├── Board/
│       │   │   ├── Board.tsx
│       │   │   └── Board.module.css
│       │   ├── Column/
│       │   │   ├── Column.tsx
│       │   │   └── Column.module.css
│       │   ├── Card/
│       │   │   ├── Card.tsx
│       │   │   └── Card.module.css
│       │   ├── AddTaskForm/
│       │   │   ├── AddTaskForm.tsx
│       │   │   └── AddTaskForm.module.css
│       │   └── Header/
│       │       ├── Header.tsx
│       │       └── Header.module.css
│       └── styles/
│           └── globals.css           # CSS variables, reset, body styles
├── backend/
│   ├── main.py                       # FastAPI app
│   ├── models.py                     # Pydantic models
│   ├── storage.py                    # JSON file read/write
│   └── requirements.txt             # fastapi, uvicorn
└── README.md
```

---

## 3. Component Architecture

```
<App>
  ├── <Header />
  └── <Board>                         # DndContext provider, handles onDragEnd
       ├── <Column id="todo">         # SortableContext, drop zone
       │    ├── <Card />              # SortableItem, draggable
       │    ├── <Card />
       │    └── <AddTaskForm />       # Shown/hidden via local state
       ├── <Column id="progress">
       │    └── ...
       └── <Column id="done">
            └── ...
```

### Component responsibilities

| Component | State | Props | Notes |
|-----------|-------|-------|-------|
| **App** | `boardData`, `loading` | — | Fetches data on mount, passes down |
| **Board** | `activeId` (drag state) | `data`, `onMove`, `onReorder` | Wraps `DndContext`, computes drag events |
| **Column** | `showForm` | `id`, `title`, `tasks`, `onAdd`, `onDelete` | Wraps `SortableContext` |
| **Card** | — | `task`, `onDelete` | Uses `useSortable()` from dnd-kit |
| **AddTaskForm** | `text` | `onSubmit`, `onCancel` | Textarea + buttons, Enter/Escape handling |
| **Header** | — | — | Pure presentational |

### Types (`types.ts`)

```typescript
export interface Task {
  id: string;
  text: string;
}

export type ColumnId = 'todo' | 'progress' | 'done';

export type BoardData = Record<ColumnId, Task[]>;

export interface ColumnConfig {
  id: ColumnId;
  title: string;
  color: string;       // CSS variable name for the dot color
}
```

---

## 4. API Integration Plan

### 4.1 Backend: Migrate to FastAPI

Replace `server.py` with a FastAPI app that provides proper RESTful endpoints.

**Endpoints:**

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/api/tasks` | — | `BoardData` | Fetch all tasks |
| `PUT` | `/api/tasks` | `BoardData` | `{ status: "ok" }` | Replace all tasks (keeps current bulk-save behavior) |
| `POST` | `/api/tasks/{column}` | `{ text }` | `Task` | Add a single task (future improvement) |
| `DELETE` | `/api/tasks/{column}/{id}` | — | `{ status: "ok" }` | Delete a single task (future improvement) |

For the initial migration, only `GET` and `PUT` are required (matching current behavior). Individual CRUD endpoints can be added later without breaking the frontend.

**`backend/models.py`:**

```python
from pydantic import BaseModel

class Task(BaseModel):
    id: str
    text: str

class BoardData(BaseModel):
    todo: list[Task] = []
    progress: list[Task] = []
    done: list[Task] = []
```

**`backend/main.py`** (core):

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import BoardData
from storage import load_tasks, save_tasks

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/tasks", response_model=BoardData)
def get_tasks():
    return load_tasks()

@app.put("/api/tasks")
def put_tasks(data: BoardData):
    save_tasks(data.model_dump())
    return {"status": "ok"}
```

### 4.2 Frontend: API Client

**`frontend/src/api/tasks.ts`:**

```typescript
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8081';

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
```

- API URL pulled from env var (`VITE_API_URL`) — no more hardcoded IP.
- Vite proxy can be configured in `vite.config.ts` to avoid CORS during development.

---

## 5. Migration Steps

### Phase 1: Backend (keep frontend untouched)

1. **Create `backend/` directory** with `main.py`, `models.py`, `storage.py`, `requirements.txt`
2. **Port `server.py` logic** into FastAPI — same endpoints, same JSON file path
3. **Verify** the existing `index.html` works against the new backend (should be drop-in since endpoints are identical)
4. **Remove** `server.py` once verified

### Phase 2: Frontend scaffold

5. **Scaffold Vite project**: `npm create vite@latest frontend -- --template react-ts`
6. **Install dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
7. **Extract CSS** from `index.html` into `globals.css` and component-level `.module.css` files (mostly copy-paste with class name adjustments)
8. **Create `types.ts`** with shared type definitions

### Phase 3: Build components (bottom-up)

9. **Header** — pure presentational, no logic
10. **Card** — integrate `useSortable()`, port card styles
11. **AddTaskForm** — port textarea + submit/cancel logic
12. **Column** — compose Card + AddTaskForm, wire up `SortableContext`
13. **Board** — compose Columns, set up `DndContext`, handle `onDragEnd`
14. **App** — fetch data on mount, pass handlers down, loading state

### Phase 4: Integration & cleanup

15. **Wire API client** — connect `fetchTasks`/`saveTasks` to App state
16. **Configure Vite proxy** for local dev (`/api` → `http://localhost:8081`)
17. **Test full flow**: add task, drag between columns, reorder within column, delete task
18. **Remove `index.html`** once React app is fully functional
19. **Update README** with new dev/run instructions

### Phase 5: Enhancements (optional, post-migration)

- Add individual task CRUD endpoints to reduce payload size
- Add task editing (click-to-edit on card text)
- Add `createdAt`/`updatedAt` timestamps to tasks
- Swap JSON file storage for SQLite via `aiosqlite`
- Add error toasts for failed API calls
- Add optimistic updates for snappier UX

---

## Estimated File Count

| Area | Files |
|------|-------|
| Frontend source | ~14 (tsx + css modules + types + api) |
| Frontend config | ~4 (package.json, tsconfig, vite.config, index.html) |
| Backend | ~4 (main.py, models.py, storage.py, requirements.txt) |
| **Total** | **~22** |

This is a modest increase from 2 files, but each file has a single clear responsibility and the project becomes maintainable and extensible.
