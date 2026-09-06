require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
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
app.use('/api/chat',       require('./routes/chat'));
app.use('/api/todos',      require('./routes/todos'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the built frontend so the whole app is reachable on this one port
// without also running the separate Vite dev server — `npm --prefix frontend
// run build` first. SPA fallback lets client-side routes (e.g. /review,
// /notes) survive a hard refresh: any non-API GET that isn't a real static
// file falls through to index.html and React Router takes it from there.
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
} else {
  console.warn('frontend/dist not found — run `npm --prefix frontend run build` to serve the UI from this port.');
}

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
