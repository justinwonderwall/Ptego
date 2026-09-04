const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Images inserted into a template body stay on disk (unlike the knowledge
// extractor's uploads, which are only scratch input for the AI call).
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

router.get('/', (req, res) => {
  const rows = db.query('SELECT * FROM templates ORDER BY updated_at DESC');
  res.json(rows);
});

router.post('/', (req, res) => {
  const { title, content, type } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  const result = db.run(
    'INSERT INTO templates (title, content, type) VALUES (?, ?, ?)',
    [title.trim(), content || '', type === 'note' ? 'note' : 'template']
  );
  const row = db.queryOne('SELECT * FROM templates WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const { title, content, type } = req.body;
  const updates = [];
  const params = [];
  if (title !== undefined)   { updates.push('title = ?');   params.push(title.trim()); }
  if (content !== undefined) { updates.push('content = ?'); params.push(content); }
  if (type !== undefined)    { updates.push('type = ?');    params.push(type === 'note' ? 'note' : 'template'); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push("updated_at = datetime('now')");
  params.push(Number(req.params.id));
  db.run(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`, params);
  const row = db.queryOne('SELECT * FROM templates WHERE id = ?', [req.params.id]);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM templates WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
