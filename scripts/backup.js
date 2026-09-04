// Daily backup: dumps the sqlite db to a diffable JSON snapshot and mirrors
// uploaded files, both under backups/ — which IS tracked in git (unlike
// backend/db/app.db* and backend/uploads/, which stay gitignored since they're
// live/binary). Run via `npm run backup`, or on the daily launchd schedule.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'backend/db/app.db');
const UPLOADS_DIR = path.join(ROOT, 'backend/uploads');
const BACKUP_DIR = path.join(ROOT, 'backups');
const SNAPSHOT_PATH = path.join(BACKUP_DIR, 'db-snapshot.json');
const BACKUP_UPLOADS_DIR = path.join(BACKUP_DIR, 'uploads');

function dumpDatabase() {
  const db = new Database(DB_PATH, { readonly: true });
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all().map(r => r.name);

  const snapshot = { exportedAt: new Date().toISOString(), tables: {} };
  for (const table of tables) {
    snapshot.tables[table] = db.prepare(`SELECT * FROM ${table}`).all();
  }
  db.close();

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`Snapshot written: ${SNAPSHOT_PATH}`);
}

function mirrorUploads() {
  if (!fs.existsSync(UPLOADS_DIR)) return;
  fs.rmSync(BACKUP_UPLOADS_DIR, { recursive: true, force: true });
  fs.cpSync(UPLOADS_DIR, BACKUP_UPLOADS_DIR, { recursive: true });
  console.log(`Uploads mirrored: ${BACKUP_UPLOADS_DIR}`);
}

dumpDatabase();
mirrorUploads();
