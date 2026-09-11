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
  question_no   TEXT,                 -- 打卡截图里识别出的题号（有的话），用于关联错题集
  created_at    TEXT DEFAULT (datetime('now'))
);

-- 错题集：打卡截图识别出题号且正确率 < 50% 时自动收录，用艾宾浩斯间隔重复
-- 提醒重做；同一题号后续每次打卡都会追加一条 attempts 记录并重新计算下次
-- 复习时间，连续 2 次重做正确率 ≥ 70% 视为掌握，退出复习队列。
CREATE TABLE IF NOT EXISTS mistakes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type_id  INTEGER NOT NULL REFERENCES task_types(id),
  question_no   TEXT NOT NULL,
  attempts      TEXT DEFAULT '[]',    -- JSON array of { date, score_pct }
  consec_pass   INTEGER DEFAULT 0,    -- 连续达标（≥70%）次数，达到 2 即毕业
  ease          REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetitions   INTEGER DEFAULT 0,
  next_review   TEXT,
  mastered      INTEGER DEFAULT 0,
  important     INTEGER DEFAULT 0,    -- 用户手动标记的重点/难记错题
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category      TEXT NOT NULL,
  term_en       TEXT,
  meaning_zh    TEXT,
  usage_example TEXT,
  study_note    TEXT,
  skill_tags    TEXT,                 -- 逗号分隔，取值 read/speak/write，可多选
  vocab_type    TEXT,                 -- 生词本分类：pronunciation/spelling/reading，决定复习时的练习方式
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
  important     INTEGER DEFAULT 0,    -- 用户手动标记的重点/难记知识点
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

CREATE TABLE IF NOT EXISTS todos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  content       TEXT NOT NULL,
  task_type_id  INTEGER REFERENCES task_types(id),
  done          INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kp_next_review ON knowledge_points(next_review);
CREATE INDEX IF NOT EXISTS idx_kp_category   ON knowledge_points(category);
CREATE INDEX IF NOT EXISTS idx_log_date      ON practice_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_mistakes_next_review ON mistakes(next_review);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mistakes_task_question ON mistakes(task_type_id, question_no);
