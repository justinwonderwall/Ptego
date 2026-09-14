const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const e = new Error(data.code || `HTTP ${res.status}`);
    e.code = data.code || 'generic';
    throw e;
  }
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
  deletePracticeLog: (id)  => request(`/practice/logs/${id}`, { method: 'DELETE' }),
  parsePracticeScreenshot: (formData) => fetch(BASE + '/practice/logs/parse-screenshot', { method: 'POST', body: formData })
    .then(r => r.json().then(d => { if (!r.ok) { const e = new Error(d.code || 'generic'); e.code = d.code || 'generic'; throw e; } return d; })),

  // Knowledge
  extractKnowledge: (formData) => fetch(BASE + '/knowledge/extract', { method: 'POST', body: formData })
    .then(r => r.json().then(d => { if (!r.ok) { const e = new Error(d.code || 'generic'); e.code = d.code || 'generic'; throw e; } return d; })),
  saveKnowledge: (points) => request('/knowledge', { method: 'POST', body: JSON.stringify(points) }),
  getKnowledge: (params)  => request('/knowledge?' + new URLSearchParams(params)),
  updateKnowledge: (id,b) => request(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteKnowledge: (id)   => request(`/knowledge/${id}`, { method: 'DELETE' }),

  // Review
  getDue: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.vocab_type) qs.set('vocab_type', params.vocab_type);
    if (params.important)  qs.set('important', '1');
    const s = qs.toString();
    return request(`/review/due${s ? '?' + s : ''}`);
  },
  gradeKP: (id, result)  => request(`/review/${id}/grade`, { method: 'POST', body: JSON.stringify({ result }) }),
  getReviewStats: ()      => request('/review/stats'),

  // Dictionary
  lookupWord: (word)      => request(`/dictionary/${encodeURIComponent(word)}`),

  // Mistake book (错题集)
  getMistakesDue: ()       => request('/mistakes/due'),
  getMistakes: (params = {}) => request('/mistakes?' + new URLSearchParams(params)),
  getMistakeStats: ()      => request('/mistakes/stats'),
  markMistakeMastered: (id) => request(`/mistakes/${id}/mastered`, { method: 'PUT' }),
  toggleMistakeImportant: (id, important) => request(`/mistakes/${id}/important`, { method: 'PUT', body: JSON.stringify({ important }) }),
  deleteMistake: (id)      => request(`/mistakes/${id}`, { method: 'DELETE' }),

  // Templates
  getTemplates: ()        => request('/templates'),
  createTemplate: (body)  => request('/templates', { method: 'POST', body: JSON.stringify(body) }),
  updateTemplate: (id, b) => request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteTemplate: (id)    => request(`/templates/${id}`, { method: 'DELETE' }),
  uploadTemplateImage: (formData) => fetch(BASE + '/templates/upload-image', { method: 'POST', body: formData })
    .then(r => r.json().then(d => { if (!r.ok) { const e = new Error(d.code || 'generic'); e.code = d.code || 'generic'; throw e; } return d; })),

  // AI tutor chat
  chatWithTutor: (formData) => fetch(BASE + '/chat', { method: 'POST', body: formData })
    .then(r => r.json().then(d => { if (!r.ok) { const e = new Error(d.code || 'generic'); e.code = d.code || 'generic'; throw e; } return d; })),

  // Todos
  getTodos: ()             => request('/todos'),
  createTodo: (body)       => request('/todos', { method: 'POST', body: JSON.stringify(body) }),
  updateTodo: (id, b)      => request(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteTodo: (id)         => request(`/todos/${id}`, { method: 'DELETE' }),
};
