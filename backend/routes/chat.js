const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();
const chatTutor = require('../services/chatTutor');

const upload = multer({ dest: require('os').tmpdir(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/', upload.single('image'), async (req, res) => {
  const { message } = req.body;
  let history = [];
  try {
    history = req.body.history ? JSON.parse(req.body.history) : [];
  } catch (_) { /* ignore malformed history, just start fresh */ }

  if (!message?.trim() && !req.file) {
    return res.status(400).json({ code: 'MISSING_QUESTION' });
  }

  try {
    const reply = await chatTutor.chat({
      message: message?.trim() || null,
      imagePath: req.file?.path,
      mimetype: req.file?.mimetype,
      history,
    });
    res.json({ reply });
  } catch (err) {
    console.error('chat error:', err);
    res.status(500).json({ code: err.code || 'generic' });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

module.exports = router;
