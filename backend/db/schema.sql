CREATE TABLE IF NOT EXISTS settings (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  exam_date     TEXT,
  theme         TEXT DEFAULT 'light',
  target_band   TEXT                 -- 目标雅思等效分：'6' | '7' | '8'
);

CREATE TABLE IF NOT EXISTS task_types (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  section       TEXT,
  daily_target  INTEGER DEFAULT 10,
  sort_order    INTEGER DEFAULT 0,
  archived      INTEGER DEFAULT 0,
  ai_graded     INTEGER DEFAULT 0,   -- 1 = AI 评分
  score_weight  TEXT                 -- 占分权重，如 "4%" "<1%"
);

CREATE TABLE IF NOT EXISTS practice_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type_id  INTEGER NOT NULL REFERENCES task_types(id),
  log_date      TEXT NOT NULL,
  count         INTEGER DEFAULT 1,
  score_pct     REAL,
  note          TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category      TEXT NOT NULL,
  term_en       TEXT,
  meaning_zh    TEXT,
  usage_example TEXT,
  study_note    TEXT,
  skill_tags    TEXT,                 -- 逗号分隔，取值 read/speak/write，可多选
  phonetic      TEXT,
  audio_url     TEXT,
  source_type   TEXT,
  raw_input     TEXT,
  ease          REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetitions   INTEGER DEFAULT 0,
  next_review   TEXT,
  last_result   TEXT,
  mastered      INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS templates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  content       TEXT,                -- rich-text HTML from the notes editor
  type          TEXT DEFAULT 'template', -- 'note'(学习笔记) | 'template'(模板)
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kp_next_review ON knowledge_points(next_review);
CREATE INDEX IF NOT EXISTS idx_kp_category   ON knowledge_points(category);
CREATE INDEX IF NOT EXISTS idx_log_date      ON practice_logs(log_date);
