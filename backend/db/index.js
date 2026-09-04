const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'app.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

// better-sqlite3 writes each statement straight to disk (WAL-backed) — no
// whole-file read-into-memory/export-and-overwrite cycle like the previous
// sql.js setup, which was the root cause of data loss when multiple backend
// processes (e.g. a stray `node --watch` restart) raced to save a stale
// in-memory snapshot over newer data.
async function initDb() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // Migrate: add columns introduced after initial table creation
  const kpCols = db.pragma('table_info(knowledge_points)').map(c => c.name);
  if (!kpCols.includes('study_note')) {
    db.exec('ALTER TABLE knowledge_points ADD COLUMN study_note TEXT');
  }
  if (!kpCols.includes('skill_tags')) {
    db.exec('ALTER TABLE knowledge_points ADD COLUMN skill_tags TEXT');
  }

  const settingsCols = db.pragma('table_info(settings)').map(c => c.name);
  if (!settingsCols.includes('target_band')) {
    db.exec('ALTER TABLE settings ADD COLUMN target_band TEXT');
  }

  const templateCols = db.pragma('table_info(templates)').map(c => c.name);
  if (!templateCols.includes('type')) {
    db.exec("ALTER TABLE templates ADD COLUMN type TEXT DEFAULT 'template'");
  }

  // Seed task types
  const { c: taskTypeCount } = db.prepare('SELECT COUNT(*) as c FROM task_types').get();
  if (taskTypeCount === 0) {
    // name, section, daily_target, sort_order, ai_graded, score_weight
    const seeds = [
      // Speaking
      ['Read Aloud',                'Speaking',  10, 0,  1, '4%'],
      ['Repeat Sentence',           'Speaking',  15, 1,  1, '7%'],
      ['Describe Image',            'Speaking',   5, 2,  1, '15%'],
      ['Retell Lecture',            'Speaking',   3, 3,  1, '6%'],
      ['Answer Short Question',     'Speaking',   5, 4,  1, '2%'],
      ['Summarize Group Discussion','Speaking',   3, 5,  1, '9%'],
      ['Respond to a Situation',    'Speaking',   3, 6,  1, '6%'],
      // Writing
      ['Summarize Written Text',    'Writing',    2, 7,  1, '7%'],
      ['Write Essay',               'Writing',    1, 8,  1, '7%'],
      // Reading
      ['Fill in the Blanks (Dropdown)',     'Reading',  8, 9,  0, '7%'],
      ['Multiple Choice (Multiple)',        'Reading',  4, 10, 0, '1%'],
      ['Reorder Paragraph',                'Reading',  5, 11, 0, '3%'],
      ['Fill in the Blanks (Drag & Drop)', 'Reading',  8, 12, 0, '6%'],
      ['Multiple Choice (Single)',         'Reading',  4, 13, 0, '<1%'],
      // Listening
      ['Summarize Spoken Text',     'Listening',  3, 14, 1, '4%'],
      ['Multiple Choice (Multiple)','Listening',  4, 15, 0, '1%'],
      ['Fill in the Blanks',        'Listening',  5, 16, 0, '3%'],
      ['Highlight Correct Summary', 'Listening',  3, 17, 0, '<1%'],
      ['Multiple Choice (Single)',  'Listening',  4, 18, 0, '<1%'],
      ['Select Missing Word',       'Listening',  3, 19, 0, '1%'],
      ['Highlight Incorrect Words', 'Listening',  5, 20, 0, '4%'],
      ['Write from Dictation',      'Listening', 15, 21, 0, '5%'],
    ];
    const stmt = db.prepare(
      'INSERT INTO task_types (name, section, daily_target, sort_order, ai_graded, score_weight) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertAll = db.transaction(rows => { for (const s of rows) stmt.run(...s); });
    insertAll(seeds);
  }

  const settingsRow = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!settingsRow) {
    db.exec("INSERT INTO settings (id, theme) VALUES (1, 'light')");
  }

  return db;
}

function query(sql, params = []) {
  return db.prepare(sql).all(params);
}

function queryOne(sql, params = []) {
  return db.prepare(sql).get(params) || null;
}

function run(sql, params = []) {
  const info = db.prepare(sql).run(params);
  return { lastInsertRowid: info.lastInsertRowid };
}

function getDb() { return db; }

module.exports = { initDb, query, queryOne, run, getDb };
