const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const listEl = document.getElementById('task-list');
const emptyStateEl = document.getElementById('empty-state');
const formEl = document.getElementById('add-form');
const titleInput = document.getElementById('title-input');
const priorityInput = document.getElementById('priority-input');

async function fetchTasks() {
  const res = await fetch('/api/tasks');
  const tasks = await res.json();
  render(tasks);
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

function render(tasks) {
  const sorted = sortTasks(tasks);
  listEl.innerHTML = '';
  emptyStateEl.hidden = sorted.length > 0;

  for (const task of sorted) {
    const li = document.createElement('li');
    li.className = `task${task.done ? ' done' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => toggleDone(task.id, checkbox.checked));

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;

    const badge = document.createElement('span');
    badge.className = `priority-badge ${task.priority}`;
    badge.textContent = task.priority;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.append(checkbox, title, badge, deleteBtn);
    listEl.appendChild(li);
  }
}

async function addTask(title, priority) {
  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority }),
  });
  await fetchTasks();
}

async function toggleDone(id, done) {
  await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  });
  await fetchTasks();
}

async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  await fetchTasks();
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  addTask(title, priorityInput.value);
  titleInput.value = '';
  priorityInput.value = 'medium';
  titleInput.focus();
});

fetchTasks();
