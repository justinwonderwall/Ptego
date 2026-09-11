const express = require('express');
const router = express.Router();
const db = require('../db');

const parseRow = (r) => ({ ...r, attempts: JSON.parse(r.attempts || '[]') });

router.get('/due', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.query(
    `SELECT m.*, tt.name as task_name, tt.section as task_section FROM mistakes m
     JOIN task_types tt ON tt.id = m.task_type_id
     WHERE m.mastered = 0 AND (m.next_review IS NULL OR m.next_review <= ?)
     ORDER BY m.next_review ASC, m.id ASC`,
    [today]
  );
  res.json(rows.map(parseRow));
});

router.get('/', (req, res) => {
  const { mastered } = req.query;
  const conditions = [];
  const params = [];
  if (mastered !== undefined) { conditions.push('m.mastered = ?'); params.push(mastered === 'true' ? 1 : 0); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = db.query(
    `SELECT m.*, tt.name as task_name, tt.section as task_section FROM mistakes m
     JOIN task_types tt ON tt.id = m.task_type_id
     ${where}
     ORDER BY m.mastered ASC, m.next_review ASC, m.updated_at DESC`,
    params
  );
  res.json(rows.map(parseRow));
});

router.get('/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const due = db.queryOne(
    `SELECT COUNT(*) as c FROM mistakes WHERE mastered = 0 AND (next_review IS NULL OR next_review <= ?)`,
    [today]
  );
  const total = db.queryOne('SELECT COUNT(*) as c FROM mistakes');
  const mastered = db.queryOne('SELECT COUNT(*) as c FROM mistakes WHERE mastered = 1');
  res.json({ due_today: due?.c || 0, total: total?.c || 0, mastered: mastered?.c || 0 });
});

router.put('/:id/mastered', (req, res) => {
  db.run(`UPDATE mistakes SET mastered = 1, updated_at = datetime('now') WHERE id = ?`, [req.params.id]);
  const row = db.queryOne(
    `SELECT m.*, tt.name as task_name, tt.section as task_section FROM mistakes m JOIN task_types tt ON tt.id = m.task_type_id WHERE m.id = ?`,
    [req.params.id]
  );
  res.json(parseRow(row));
});

router.put('/:id/important', (req, res) => {
  const { important } = req.body;
  db.run(`UPDATE mistakes SET important = ?, updated_at = datetime('now') WHERE id = ?`, [important ? 1 : 0, req.params.id]);
  const row = db.queryOne(
    `SELECT m.*, tt.name as task_name, tt.section as task_section FROM mistakes m JOIN task_types tt ON tt.id = m.task_type_id WHERE m.id = ?`,
    [req.params.id]
  );
  res.json(parseRow(row));
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM mistakes WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
