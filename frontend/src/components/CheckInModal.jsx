import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import AccuracyCalculator from './AccuracyCalculator';

export default function CheckInModal({ task, onClose, onSuccess }) {
  const { t } = useTranslation();
  const MISTAKE_MESSAGES = {
    added: t('checkIn.mistakeAdded'),
    updated: t('checkIn.mistakeUpdated'),
    mastered: t('checkIn.mistakeMastered'),
  };
  const [count, setCount] = useState('1');
  const [score, setScore] = useState('');
  const [questionNo, setQuestionNo] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCalc, setShowCalc] = useState(false);
  const [parsingImage, setParsingImage] = useState(false);
  const [parseNote, setParseNote] = useState(null);
  const [dueMistakes, setDueMistakes] = useState([]);

  // Surface today's due redos for this exact task so the user can pick the
  // question number with one click instead of having to remember/retype it —
  // that's the whole reason the mistake book links to a check-in in the first
  // place, so guessing the number back out shouldn't be the friction point.
  useEffect(() => {
    api.getMistakesDue()
      .then(rows => setDueMistakes(rows.filter(m => m.task_type_id === task.id)))
      .catch(() => {});
  }, [task.id]);

  const submit = async () => {
    const n = parseInt(count, 10);
    if (!n || n < 1) { setError(t('checkIn.errInvalidCount')); return; }
    const s = score !== '' ? parseFloat(score) : null;
    if (s !== null && (s < 0 || s > 100)) { setError(t('checkIn.errInvalidScore')); return; }

    setLoading(true);
    setError(null);
    try {
      const result = await api.logPractice({
        task_type_id: task.id,
        count: n,
        score_pct: s,
        question_no: questionNo.trim() || null,
        note: note.trim() || null,
      });
      onSuccess(result.mistake ? MISTAKE_MESSAGES[result.mistake.action] : null);
      onClose();
    } catch (e) {
      setError(t(`errors.${e.code}`, t('errors.generic')));
      setLoading(false);
    }
  };

  const handleKey = e => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') submit();
  };

  const applyCalculated = (pct) => {
    setScore(String(pct));
    setShowCalc(false);
  };

  const handleImageFile = async (file) => {
    setParsingImage(true);
    setError(null);
    setParseNote(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const result = await api.parsePracticeScreenshot(fd);
      if (result.count != null) setCount(String(result.count));
      if (result.score_pct != null) setScore(String(result.score_pct));
      if (result.question_no) setQuestionNo(result.question_no);
      if (result.count == null && result.score_pct == null) {
        setError(t('checkIn.errNoDataRecognized'));
      } else {
        setParseNote(result.note || t('checkIn.aiRecognizedFilled'));
      }
    } catch (e) {
      setError(t(`errors.${e.code}`, t('errors.generic')));
    } finally {
      setParsingImage(false);
    }
  };

  // Paste bubbles up from whatever's focused inside the card (the 完成题数
  // field is autoFocused on open, so Ctrl+V works the instant the modal is
  // up — no click needed first).
  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgFile = items
      .filter(it => it.kind === 'file' && it.type.startsWith('image/'))
      .map(it => it.getAsFile())
      .filter(Boolean)[0];
    if (imgFile) { e.preventDefault(); handleImageFile(imgFile); }
  };

  // Portaled to <body>: DailyPlan's card-surface ancestor uses backdrop-filter,
  // which turns it into the containing block for `fixed` descendants — without
  // the portal this modal shrinks to the card's box instead of the viewport.
  return createPortal(
    // pr-[31%] approximates the right knowledge-entry column's width (incl. its
    // gap/padding) so the card centers within the left dashboard column only —
    // pointer-events-none on this wrapper keeps the rest of the page clickable,
    // the card itself opts back in.
    <div className="fixed inset-0 z-50 flex items-center justify-center pr-[31%] pointer-events-none">
    <div
      onPaste={handlePaste}
      className={`pointer-events-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
        border border-slate-200 dark:border-slate-700 p-7 space-y-4 max-h-[calc(100vh-3rem)] overflow-y-auto
        transition-[width] ${showCalc ? 'w-[480px]' : 'w-96'}`}
    >
      {showCalc ? (
        <AccuracyCalculator initialGroups={count} onApply={applyCalculated} onCancel={() => setShowCalc(false)} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{task.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('checkIn.todayProgress', { done: task.done_today || 0, target: task.daily_target })}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300 text-xl leading-none shrink-0"
            >
              ×
            </button>
          </div>

          {/* Today's due redos for this task — click a chip to fill 题号
              instead of having to remember/retype the number. */}
          {dueMistakes.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1.5">{t('checkIn.dueTodayLabel')}</p>
              <div className="flex flex-wrap gap-1.5">
                {dueMistakes.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setQuestionNo(m.question_no)}
                    className={`text-xs px-2 py-1 rounded-md border font-medium transition-colors ${
                      questionNo === m.question_no
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white dark:bg-slate-700 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                    }`}
                  >
                    #{m.question_no}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI screenshot fill — paste (Ctrl+V) a practice-results screenshot
              anywhere in this card and let the AI read off 完成题数/正确率
              instead of typing them by hand. No file picker needed. */}
          <div>
            <div
              className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-slate-600
                rounded-lg py-2 text-xs font-medium text-slate-400 dark:text-slate-500"
            >
              {parsingImage ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  {t('checkIn.recognizing')}
                </>
              ) : (
                <>{t('checkIn.pasteHint')}</>
              )}
            </div>
            {parseNote && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">✓ {parseNote}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">
              {t('checkIn.countLabel')} <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={count}
              onChange={e => setCount(e.target.value)}
              onKeyDown={handleKey}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-slate-600 dark:text-slate-400">
                {t('checkIn.scoreLabel')} <span className="text-slate-400 text-xs">{t('checkIn.scoreHint')}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCalc(true)}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium shrink-0 ml-2"
              >
                {t('checkIn.calcTool')}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="100"
                placeholder={t('checkIn.scorePlaceholder')}
                value={score}
                onChange={e => setScore(e.target.value)}
                onKeyDown={handleKey}
                className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
              />
              <input
                type="text"
                placeholder={t('checkIn.questionNoPlaceholder')}
                value={questionNo}
                onChange={e => setQuestionNo(e.target.value)}
                onKeyDown={handleKey}
                title={t('checkIn.questionNoTitle')}
                className="w-28 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">
              {t('checkIn.noteLabel')} <span className="text-slate-400 text-xs">{t('checkIn.noteHint')}</span>
            </label>
            <input
              type="text"
              placeholder={t('checkIn.notePlaceholder')}
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={handleKey}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? t('checkIn.submitting') : t('home.dailyPlan.logButton')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
    </div>,
    document.body
  );
}
