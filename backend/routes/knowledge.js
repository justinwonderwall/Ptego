const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const router = express.Router();
const db = require('../db');
const aiExtractor = require('../services/aiExtractor');
const dictionaryService = require('../services/dictionary');

const toTagsString = (tags) => Array.isArray(tags) ? tags.join(',') : (tags || null);
const toTagsArray  = (row)  => ({ ...row, skill_tags: row.skill_tags ? row.skill_tags.split(',').filter(Boolean) : [] });

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/extract', upload.fields([
  { name: 'image', maxCount: 5 },
  { name: 'file', maxCount: 1 },
]), async (req, res) => {
  const imageFiles = req.files?.image || [];
  const docFile = req.files?.file?.[0] || null;
  try {
    const { text, category } = req.body;
    const images = imageFiles.map(f => ({ path: f.path, mimetype: f.mimetype }));

    let fileText = null;
    if (docFile) {
      // Browsers/OSes don't always report a reliable mimetype for less common
      // formats (docx, md), so fall back to the file extension too.
      const ext = path.extname(docFile.originalname).toLowerCase();

      if (docFile.mimetype === 'text/plain' || ext === '.txt' || ext === '.md') {
        fileText = fs.readFileSync(docFile.path, 'utf8');
      } else if (docFile.mimetype === 'application/pdf' || ext === '.pdf') {
        const buf = fs.readFileSync(docFile.path);
        const parsed = await pdfParse(buf);
        fileText = parsed.text;
        if (!fileText?.trim()) {
          return res.status(400).json({ error: 'PDF 内容为空，可能是扫描版图片 PDF，请改用图片上传' });
        }
      } else if (
        docFile.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === '.docx'
      ) {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: docFile.path });
        fileText = result.value;
        if (!fileText?.trim()) {
          return res.status(400).json({ error: 'Word 文档内容为空' });
        }
      } else if (docFile.mimetype === 'application/msword' || ext === '.doc') {
        return res.status(400).json({ error: '暂不支持旧版 .doc 格式，请在 Word 里另存为 .docx 后重新上传' });
      } else {
        return res.status(400).json({ error: `不支持的文件类型：${docFile.mimetype || ext}` });
      }
    }

    // aiExtractor reads the image files from disk (base64-encodes them for the AI
    // call), so they must stay on disk until that call finishes — clean up after.
    const points = await aiExtractor.extractKnowledge({ text, images, fileText, category });
    res.json(points);
  } catch (err) {
    console.error('Extract error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (docFile) fs.unlink(docFile.path, () => {});
    imageFiles.forEach(f => fs.unlink(f.path, () => {}));
  }
});

router.post('/', async (req, res) => {
  const points = req.body;
  if (!Array.isArray(points) || points.length === 0)
    return res.status(400).json({ error: 'Expected array of knowledge points' });

  const today = new Date().toISOString().slice(0, 10);
  const inserted = [];

  for (const p of points) {
    if (p.term_en) {
      const existing = db.queryOne(
        'SELECT id FROM knowledge_points WHERE LOWER(term_en) = LOWER(?)',
        [p.term_en]
      );
      if (existing) { inserted.push({ ...p, id: existing.id, duplicate: true }); continue; }
    }

    let phonetic = null, audio_url = null;
    if (p.term_en) {
      try {
        const dictResult = await dictionaryService.lookup(p.term_en);
        phonetic = dictResult.phonetic || null;
        audio_url = dictResult.audio_url || null;
      } catch (_) {}
    }

    const result = db.run(
      `INSERT INTO knowledge_points
        (category, term_en, meaning_zh, usage_example, study_note, skill_tags, phonetic, audio_url, source_type, raw_input, next_review)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.category, p.term_en || null, p.meaning_zh || null, p.usage_example || null, p.study_note || null,
       toTagsString(p.skill_tags), phonetic, audio_url, p.source_type || 'text', p.raw_input || null, today]
    );
    inserted.push({ ...p, id: result.lastInsertRowid, phonetic, audio_url });
  }

  res.status(201).json(inserted);
});

router.get('/', (req, res) => {
  const { category, search, page = 1 } = req.query;
  const pageSize = 20;
  const offset = (Number(page) - 1) * pageSize;
  const conditions = [];
  const params = [];

  if (category) { conditions.push('category = ?'); params.push(category); }
  if (search) {
    conditions.push('(term_en LIKE ? OR meaning_zh LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const totalRow = db.queryOne(`SELECT COUNT(*) as c FROM knowledge_points ${where}`, params);
  const rows = db.query(
    `SELECT * FROM knowledge_points ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  res.json({ total: totalRow?.c || 0, page: Number(page), pageSize, rows: rows.map(toTagsArray) });
});

router.put('/:id', (req, res) => {
  const { category, term_en, meaning_zh, usage_example, study_note, skill_tags } = req.body;
  const updates = [];
  const params = [];
  if (category !== undefined)      { updates.push('category = ?');      params.push(category); }
  if (term_en !== undefined)       { updates.push('term_en = ?');       params.push(term_en); }
  if (meaning_zh !== undefined)    { updates.push('meaning_zh = ?');    params.push(meaning_zh); }
  if (usage_example !== undefined) { updates.push('usage_example = ?'); params.push(usage_example); }
  if (study_note !== undefined)    { updates.push('study_note = ?');    params.push(study_note); }
  if (skill_tags !== undefined)    { updates.push('skill_tags = ?');    params.push(toTagsString(skill_tags)); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push("updated_at = datetime('now')");
  params.push(Number(req.params.id));
  db.run(`UPDATE knowledge_points SET ${updates.join(', ')} WHERE id = ?`, params);
  const row = db.queryOne('SELECT * FROM knowledge_points WHERE id = ?', [req.params.id]);
  res.json(toTagsArray(row));
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM knowledge_points WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
