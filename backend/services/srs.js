function grade(kp, result) {
  let { ease, interval_days, repetitions } = kp;
  let mastered = false;

  if (result === 'forgot') {
    repetitions = 0;
    interval_days = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    repetitions += 1;
    if (repetitions === 1)      interval_days = 1;
    else if (repetitions === 2) interval_days = 3;
    else                        interval_days = Math.round(interval_days * ease);
    ease = ease + 0.1;
    if (interval_days >= 60) mastered = true;
  }

  const next = new Date();
  next.setDate(next.getDate() + interval_days);
  const next_review = next.toISOString().slice(0, 10);

  return { ease, interval_days, repetitions, next_review, mastered };
}

module.exports = { grade };
