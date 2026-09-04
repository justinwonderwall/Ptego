require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/settings',   require('./routes/settings'));
app.use('/api/task-types', require('./routes/taskTypes'));
app.use('/api/practice',   require('./routes/practice'));
app.use('/api/knowledge',  require('./routes/knowledge'));
app.use('/api/review',     require('./routes/review'));
app.use('/api/dictionary', require('./routes/dictionary'));
app.use('/api/templates',  require('./routes/templates'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
