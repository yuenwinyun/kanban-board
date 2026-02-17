import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler

MEMORY_DIR = '/home/rpimaster/Projects/memory'
TASKS_FILE = os.path.join(MEMORY_DIR, 'kanban.json')

def load_tasks():
    if os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, 'r') as f:
            return json.load(f)
    return {'todo': [], 'in_progress': [], 'done': []}

def save_tasks(tasks):
    with open(TASKS_FILE, 'w') as f:
        json.dump(tasks, f)

tasks = load_tasks()

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/tasks':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(tasks).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_PUT(self):
        if self.path == '/api/tasks':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            global tasks
            tasks = json.loads(body)
            save_tasks(tasks)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8081), Handler)
    print(f'Server running on port 8081 (memory: {TASKS_FILE})')
    server.serve_forever()
