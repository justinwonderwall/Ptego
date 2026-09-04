const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const includeArchived = req.query.includeArchived === '1';
  const rows = db.query(
    includeArchived
      ? 'SELECT * FROM task_types ORDER BY sort_order, id'
      : 'SELECT * FROM task_types WHERE archived = 0 ORDER BY sort_order, id'
  );
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, section, daily_target = 10 } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const maxRes = db.queryOne('SELECT MAX(sort_order) as m FROM task_types');
  const maxOrder = maxRes?.m || 0;
  const result = db.run(
    'INSERT INTO task_types (name, section, daily_target, sort_order) VALUES (?, ?, ?, ?)',
    [name, section || null, daily_target, maxOrder + 1]
  );
  const row = db.queryOne('SELECT * FROM task_types WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const { name, section, daily_target, archived } = req.body;
  const updates = [];
  const params = [];
  if (name !== undefined)         { updates.push('name = ?');         params.push(name); }
  if (section !== undefined)      { updates.push('section = ?');      params.push(section); }
  if (daily_target !== undefined) { updates.push('daily_target = ?'); params.push(daily_target); }
  if (archived !== undefined)     { updates.push('archived = ?');     params.push(archived ? 1 : 0); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(Number(req.params.id));
  db.run(`UPDATE task_types SET ${updates.join(', ')} WHERE id = ?`, params);
  const row = db.queryOne('SELECT * FROM task_types WHERE id = ?', [req.params.id]);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  db.run('UPDATE task_types SET archived = 1 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
