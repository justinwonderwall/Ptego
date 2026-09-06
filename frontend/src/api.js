const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Settings
  getSettings: ()         => request('/settings'),
  updateSettings: (body)  => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),

  // Task types
  getTaskTypes: ()        => request('/task-types'),
  createTaskType: (body)  => request('/task-types', { method: 'POST', body: JSON.stringify(body) }),
  updateTaskType: (id, b) => request(`/task-types/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteTaskType: (id)    => request(`/task-types/${id}`, { method: 'DELETE' }),

  // Practice
  logPractice: (body)     => request('/practice/logs', { method: 'POST', body: JSON.stringify(body) }),
  getTodayProgress: ()    => request('/practice/logs/today'),
  getAccuracy: (range, opts = {}) => request(`/practice/logs/accuracy?${new URLSearchParams({ range, ...opts })}`),
  getStreak: ()           => request('/practice/logs/streak'),
  getTaskLogs: (taskTypeId) => request('/practice/logs?' + new URLSearchParams({ task_type_id: taskTypeId })),
  parsePracticeScreenshot: (formData) => fetch(BASE + '/practice/logs/parse-screenshot', { method: 'POST', body: formData })
    .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error); return d; })),

  // Knowledge
  extractKnowledge: (formData) => fetch(BASE + '/knowledge/extract', { method: 'POST', body: formData })
    .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error); return d; })),
  saveKnowledge: (points) => request('/knowledge', { method: 'POST', body: JSON.stringify(points) }),
  getKnowledge: (params)  => request('/knowledge?' + new URLSearchParams(params)),
  updateKnowledge: (id,b) => request(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteKnowledge: (id)   => request(`/knowledge/${id}`, { method: 'DELETE' }),

  // Review
  getDue: ()              => request('/review/due'),
  gradeKP: (id, result)  => request(`/review/${id}/grade`, { method: 'POST', body: JSON.stringify({ result }) }),
  getReviewStats: ()      => request('/review/stats'),

  // Dictionary
  lookupWord: (word)      => request(`/dictionary/${encodeURIComponent(word)}`),

  // Templates
  getTemplates: ()        => request('/templates'),
  createTemplate: (body)  => request('/templates', { method: 'POST', body: JSON.stringify(body) }),
  updateTemplate: (id, b) => request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteTemplate: (id)    => request(`/templates/${id}`, { method: 'DELETE' }),
  uploadTemplateImage: (formData) => fetch(BASE + '/templates/upload-image', { method: 'POST', body: formData })
    .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error); return d; })),

  // AI tutor chat
  chatWithTutor: (formData) => fetch(BASE + '/chat', { method: 'POST', body: formData })
    .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error); return d; })),

  // Todos
  getTodos: ()             => request('/todos'),
  createTodo: (body)       => request('/todos', { method: 'POST', body: JSON.stringify(body) }),
  updateTodo: (id, b)      => request(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteTodo: (id)         => request(`/todos/${id}`, { method: 'DELETE' }),
};
