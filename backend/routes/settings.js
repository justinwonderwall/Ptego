const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const row = db.queryOne('SELECT exam_date, theme, target_band FROM settings WHERE id = 1');
  res.json(row || { exam_date: null, theme: 'light', target_band: null });
});

router.put('/', (req, res) => {
  const { exam_date, theme, target_band } = req.body;
  const updates = [];
  const params = [];
  if (exam_date !== undefined)   { updates.push('exam_date = ?');   params.push(exam_date); }
  if (theme !== undefined)       { updates.push('theme = ?');       params.push(theme); }
  if (target_band !== undefined) { updates.push('target_band = ?'); params.push(target_band); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(1);
  db.run(`UPDATE settings SET ${updates.join(', ')} WHERE id = ?`, params);
  const row = db.queryOne('SELECT exam_date, theme, target_band FROM settings WHERE id = 1');
  res.json(row);
});

module.exports = router;
