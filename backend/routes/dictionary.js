const express = require('express');
const router = express.Router();
const dictionaryService = require('../services/dictionary');

router.get('/:word', async (req, res) => {
  try {
    const result = await dictionaryService.lookupRich(req.params.word);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
