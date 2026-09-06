const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.query(`
    SELECT todos.*, task_types.name AS task_type_name, task_types.section AS task_type_section
    FROM todos LEFT JOIN task_types ON task_types.id = todos.task_type_id
    ORDER BY done ASC, created_at DESC
  `);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { content, task_type_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' });
  const result = db.run(
    'INSERT INTO todos (content, task_type_id) VALUES (?, ?)',
    [content.trim(), task_type_id || null]
  );
  const row = db.queryOne(`
    SELECT todos.*, task_types.name AS task_type_name, task_types.section AS task_type_section
    FROM todos LEFT JOIN task_types ON task_types.id = todos.task_type_id
    WHERE todos.id = ?
  `, [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const { content, task_type_id, done } = req.body;
  const updates = [];
  const params = [];
  if (content !== undefined)      { updates.push('content = ?');      params.push(content.trim()); }
  if (task_type_id !== undefined) { updates.push('task_type_id = ?'); params.push(task_type_id || null); }
  if (done !== undefined)         { updates.push('done = ?');         params.push(done ? 1 : 0); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push("updated_at = datetime('now')");
  params.push(Number(req.params.id));
  db.run(`UPDATE todos SET ${updates.join(', ')} WHERE id = ?`, params);
  const row = db.queryOne(`
    SELECT todos.*, task_types.name AS task_type_name, task_types.section AS task_type_section
    FROM todos LEFT JOIN task_types ON task_types.id = todos.task_type_id
    WHERE todos.id = ?
  `, [req.params.id]);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM todos WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
