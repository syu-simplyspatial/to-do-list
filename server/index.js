const http = require('http');
const fs = require('fs');
const path = require('path');
const storage = require('./storage');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const PRIORITIES = ['high', 'medium', 'low'];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
};

function sendJson(res, status, data) {
  if (status === 204) {
    res.writeHead(204);
    return res.end();
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(PUBLIC_DIR, urlPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'tasks', ':id'?]
  const id = parts[2];

  if (parts.length === 2 && req.method === 'GET') {
    const tasks = storage.load();
    return sendJson(res, 200, tasks);
  }

  if (parts.length === 2 && req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const priority = body.priority;
    if (!title || !PRIORITIES.includes(priority)) {
      return sendJson(res, 400, { error: 'title and a valid priority are required' });
    }
    const tasks = storage.load();
    const task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      priority,
      done: false,
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
    storage.save(tasks);
    return sendJson(res, 201, task);
  }

  if (parts.length === 3 && req.method === 'PUT') {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
    const tasks = storage.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return sendJson(res, 404, { error: 'Task not found' });

    if (body.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title) return sendJson(res, 400, { error: 'title cannot be empty' });
      task.title = title;
    }
    if (body.priority !== undefined) {
      if (!PRIORITIES.includes(body.priority)) {
        return sendJson(res, 400, { error: 'invalid priority' });
      }
      task.priority = body.priority;
    }
    if (body.done !== undefined) {
      task.done = Boolean(body.done);
    }
    storage.save(tasks);
    return sendJson(res, 200, task);
  }

  if (parts.length === 3 && req.method === 'DELETE') {
    const tasks = storage.load();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return sendJson(res, 404, { error: 'Task not found' });
    tasks.splice(index, 1);
    storage.save(tasks);
    return sendJson(res, 204, null);
  }

  return sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res).catch((err) => {
      console.error(err);
      sendJson(res, 500, { error: 'Internal server error' });
    });
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`To-do app running at http://localhost:${PORT}`);
});
