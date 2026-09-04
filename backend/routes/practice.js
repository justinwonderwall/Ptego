const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/logs', (req, res) => {
  const { task_type_id, count = 1, score_pct, note, log_date } = req.body;
  if (!task_type_id) return res.status(400).json({ error: 'task_type_id is required' });
  const date = log_date || new Date().toISOString().slice(0, 10);
  const result = db.run(
    'INSERT INTO practice_logs (task_type_id, log_date, count, score_pct, note) VALUES (?, ?, ?, ?, ?)',
    [task_type_id, date, count, score_pct ?? null, note ?? null]
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/logs/today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const types = db.query(
    'SELECT * FROM task_types WHERE archived = 0 ORDER BY sort_order, id'
  );
  const logs = db.query(
    'SELECT task_type_id, SUM(count) as done FROM practice_logs WHERE log_date = ? GROUP BY task_type_id',
    [today]
  );
  const doneMap = Object.fromEntries(logs.map(l => [l.task_type_id, l.done]));
  const result = types.map(t => ({ ...t, done_today: doneMap[t.id] || 0 }));
  res.json(result);
});

router.get('/logs/accuracy', (req, res) => {
  const range = req.query.range || '30d';
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 3650;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const rows = db.query(
    `SELECT log_date as date, AVG(score_pct) as avg_score_pct
     FROM practice_logs
     WHERE score_pct IS NOT NULL AND log_date >= ?
     GROUP BY log_date
     ORDER BY log_date`,
    [cutoffStr]
  );
  res.json(rows);
});

router.get('/logs/streak', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const dates = db.query(
    'SELECT DISTINCT log_date FROM practice_logs ORDER BY log_date DESC'
  ).map(r => r.log_date);

  let current = 0;
  let longest = 0;
  let streak = 0;
  let prev = today;

  for (const d of dates) {
    const diff = Math.round((new Date(prev) - new Date(d)) / 86400000);
    if (diff <= 1) {
      streak++;
      if (prev === today || diff === 0) current = streak;
    } else {
      if (prev === today) current = 0;
      streak = 1;
    }
    longest = Math.max(longest, streak);
    prev = d;
  }
  if (!dates.includes(today)) current = 0;

  res.json({ current_streak: current, longest_streak: longest });
});

module.exports = router;
