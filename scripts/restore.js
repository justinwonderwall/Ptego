// Restores the sqlite db from the latest backups/db-snapshot.json (and
// mirrors backups/uploads/ back into backend/uploads/). This is the reverse
// of scripts/backup.js — use it after a fresh `git clone`, or after local
// data got lost/corrupted.
//
// Destructive: replaces the current contents of every table found in the
// snapshot. Prints a before/after row-count summary and requires --yes to
// actually apply, so you don't blow away newer local data by accident.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { initDb } = require('../backend/db');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'backend/db/app.db');
const SNAPSHOT_PATH = path.join(ROOT, 'backups/db-snapshot.json');
const BACKUP_UPLOADS_DIR = path.join(ROOT, 'backups/uploads');
const UPLOADS_DIR = path.join(ROOT, 'backend/uploads');

async function main() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`No snapshot found at ${SNAPSHOT_PATH}`);
    process.exit(1);
  }
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));

  // Ensure schema exists (safe/idempotent — CREATE TABLE IF NOT EXISTS).
  await initDb();
  const db = new Database(DB_PATH);

  console.log(`Snapshot from: ${snapshot.exportedAt}\n`);
  console.log('table                current -> snapshot');
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    const { c } = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get();
    console.log(`${table.padEnd(20)} ${String(c).padStart(7)} -> ${rows.length}`);
  }

  if (!process.argv.includes('--yes')) {
    console.log('\nThis will DELETE current rows in the tables above and replace them with\nthe snapshot. Re-run with --yes to actually apply.');
    db.close();
    return;
  }

  const restoreAll = db.transaction(() => {
    for (const [table, rows] of Object.entries(snapshot.tables)) {
      db.prepare(`DELETE FROM ${table}`).run();
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0]);
      const insert = db.prepare(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      );
      for (const row of rows) insert.run(cols.map(c => row[c]));
    }
  });
  restoreAll();
  db.close();
  console.log('\nDatabase restored.');

  if (fs.existsSync(BACKUP_UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.cpSync(BACKUP_UPLOADS_DIR, UPLOADS_DIR, { recursive: true });
    console.log('Uploads restored.');
  }
}

main();
