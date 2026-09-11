const db = require('../db');
const srs = require('./srs');

const ADD_THRESHOLD = 50;   // first attempt below this enters the mistake book
const PASS_THRESHOLD = 70;  // a redo attempt at/above this counts as "got it"
const MASTER_STREAK = 2;    // consecutive passing redos needed to graduate

// Called after every check-in that has both a question_no and a score_pct.
// A first sighting of a question only enters the book if it's a real miss
// (< ADD_THRESHOLD); every later check-in for the same task_type_id +
// question_no is treated as a redo and updates its standing regardless of
// score, so failing again just keeps it in rotation and passing enough times
// in a row graduates it.
function recordAttempt({ task_type_id, question_no, score_pct }) {
  if (score_pct == null || !question_no) return null;
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.queryOne(
    'SELECT * FROM mistakes WHERE task_type_id = ? AND question_no = ?',
    [task_type_id, question_no]
  );

  if (!existing) {
    if (score_pct >= ADD_THRESHOLD) return null;
    const graded = srs.grade({ ease: 2.5, interval_days: 0, repetitions: 0 }, 'forgot');
    db.run(
      `INSERT INTO mistakes (task_type_id, question_no, attempts, consec_pass, ease, interval_days, repetitions, next_review, mastered)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, 0)`,
      [task_type_id, question_no, JSON.stringify([{ date: today, score_pct }]),
       graded.ease, graded.interval_days, graded.repetitions, graded.next_review]
    );
    return { action: 'added' };
  }

  const attempts = JSON.parse(existing.attempts || '[]');
  attempts.push({ date: today, score_pct });
  const passed = score_pct >= PASS_THRESHOLD;
  const consecPass = passed ? existing.consec_pass + 1 : 0;
  const mastered = consecPass >= MASTER_STREAK;
  const graded = srs.grade(existing, passed ? 'know' : 'forgot');

  db.run(
    `UPDATE mistakes SET attempts = ?, consec_pass = ?, ease = ?, interval_days = ?, repetitions = ?, next_review = ?, mastered = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [JSON.stringify(attempts), consecPass, graded.ease, graded.interval_days, graded.repetitions,
     graded.next_review, mastered ? 1 : 0, existing.id]
  );
  return { action: mastered ? 'mastered' : 'updated' };
}

module.exports = { recordAttempt, ADD_THRESHOLD, PASS_THRESHOLD, MASTER_STREAK };
