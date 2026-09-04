const express = require('express');
const router = express.Router();
const db = require('../db');
const srs = require('../services/srs');

router.get('/due', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.query(
    `SELECT * FROM knowledge_points
     WHERE mastered = 0 AND (next_review IS NULL OR next_review <= ?)
     ORDER BY next_review ASC, id ASC`,
    [today]
  );
  res.json(rows.map(r => ({ ...r, skill_tags: r.skill_tags ? r.skill_tags.split(',').filter(Boolean) : [] })));
});

router.post('/:id/grade', (req, res) => {
  const { result } = req.body;
  if (result !== 'know' && result !== 'forgot')
    return res.status(400).json({ error: 'result must be "know" or "forgot"' });

  const kp = db.queryOne('SELECT * FROM knowledge_points WHERE id = ?', [req.params.id]);
  if (!kp) return res.status(404).json({ error: 'Not found' });

  const updated = srs.grade(kp, result);
  db.run(
    `UPDATE knowledge_points
     SET ease = ?, interval_days = ?, repetitions = ?, next_review = ?,
         last_result = ?, mastered = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [updated.ease, updated.interval_days, updated.repetitions,
     updated.next_review, result, updated.mastered ? 1 : 0, req.params.id]
  );
  res.json(updated);
});

router.get('/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const due = db.queryOne(
    `SELECT COUNT(*) as c FROM knowledge_points
     WHERE mastered = 0 AND (next_review IS NULL OR next_review <= ?)`,
    [today]
  );
  const total = db.queryOne('SELECT COUNT(*) as c FROM knowledge_points');
  const mastered = db.queryOne('SELECT COUNT(*) as c FROM knowledge_points WHERE mastered = 1');
  res.json({ due_today: due?.c || 0, total: total?.c || 0, mastered: mastered?.c || 0 });
});

module.exports = router;
