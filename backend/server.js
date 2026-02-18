import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_FILE = path.join(__dirname, '..', 'memory', 'kanban.json');

const app = express();
app.use(cors());
app.use(express.json());

// Load tasks from file
function loadTasks() {
  if (fs.existsSync(STORAGE_FILE)) {
    return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
  }
  return { todo: [], progress: [], done: [] };
}

// Save tasks to file
function saveTasks(data) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
}

let tasks = loadTasks();

app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

app.put('/api/tasks', (req, res) => {
  tasks = req.body;
  saveTasks(tasks);
  res.json({ status: 'ok' });
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
