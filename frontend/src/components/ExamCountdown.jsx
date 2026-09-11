import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

// PTE score targets roughly equivalent to each IELTS band (per official
// score-comparison tables). Overall isn't published for these bands.
const BAND_TARGETS = {
  '6': { speaking: 54, writing: 51, reading: 48, listening: 47 },
  '7': { speaking: 76, writing: 69, reading: 59, listening: 58 },
  '8': { speaking: 88, writing: 85, reading: 70, listening: 69 },
};
const BANDS = ['6', '7', '8'];

// Once the exam is this close, nudge the user to consider postponing —
// dismissed per exam_date, so re-showing only makes sense if they pick a
// new date (see dismissedPostpone below).
const POSTPONE_THRESHOLD_DAYS = 16;
const POSTPONE_DISMISS_KEY = 'pte-postpone-dismissed-for';

export default function ExamCountdown() {
  const { t } = useTranslation();
  const [examDate, setExamDate] = useState(null);
  const [editing, setEditing] = useState(false);
  const [inputDate, setInputDate] = useState('');
  const [targetBand, setTargetBand] = useState(null);
  const [dismissedPostpone, setDismissedPostpone] = useState(() => localStorage.getItem(POSTPONE_DISMISS_KEY));

  useEffect(() => {
    api.getSettings().then(s => {
      setExamDate(s.exam_date);
      setInputDate(s.exam_date || '');
      setTargetBand(s.target_band || null);
    });
  }, []);

  const daysLeft = examDate
    ? Math.ceil((new Date(examDate) - new Date(new Date().toDateString())) / 86400000)
    : null;

  const showPostponePrompt =
    examDate && daysLeft !== null && daysLeft >= 0 && daysLeft <= POSTPONE_THRESHOLD_DAYS &&
    dismissedPostpone !== examDate;

  const dismissPostponePrompt = () => {
    localStorage.setItem(POSTPONE_DISMISS_KEY, examDate);
    setDismissedPostpone(examDate);
  };

  const save = () => {
    if (!inputDate) return;
    api.updateSettings({ exam_date: inputDate }).then(s => {
      setExamDate(s.exam_date);
      setEditing(false);
    });
  };

  const selectBand = (band) => {
    const next = targetBand === band ? null : band;
    setTargetBand(next);
    api.updateSettings({ target_band: next });
  };

  const urgencyColor =
    daysLeft === null ? '' :
    daysLeft <= 14    ? 'from-red-500 to-rose-600' :
    daysLeft <= 30    ? 'from-orange-500 to-amber-600' :
                        'from-blue-500 to-indigo-600';

  const targets = targetBand ? BAND_TARGETS[targetBand] : null;

  return (
    <div className={`shrink-0 relative overflow-hidden bg-gradient-to-br ${urgencyColor || 'from-blue-500 to-indigo-600'} rounded-2xl p-6 text-white
      shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_20px_44px_-20px_rgb(30_41_59/0.55)]`}>
      {/* decorative ambient glows — purely visual, sit behind all content */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-black/10 blur-3xl" />

      <div className="relative z-10">
      {editing ? (
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={inputDate}
            onChange={e => setInputDate(e.target.value)}
            className="border border-white/30 rounded-lg px-3 py-2 text-sm bg-white/20 text-white focus:outline-none focus:border-white"
          />
          <button
            onClick={save}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            {t('common.confirm')}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-2 text-white/70 hover:text-white text-sm"
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              {daysLeft !== null ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-bold leading-none">{daysLeft}</span>
                  <div>
                    <div className="text-xl font-medium opacity-90">{t('home.examCountdown.daysUnit')}</div>
                    <div className="text-sm opacity-60 mt-0.5">{t('home.examCountdown.untilExam')}</div>
                  </div>
                </div>
              ) : (
                <div className="text-white/70">{t('home.examCountdown.noDateSet')}</div>
              )}
              {examDate && (
                <div className="text-xs opacity-50 mt-2">{t('home.examCountdown.examDateLabel', { date: examDate })}</div>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-white/70 hover:text-white underline"
            >
              {examDate ? t('home.examCountdown.editDate') : t('home.examCountdown.setDate')}
            </button>
          </div>

          {showPostponePrompt && (
            <div className="mt-4 bg-white/15 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm flex items-center gap-2">
                <span>⏰</span>
                {t('home.examCountdown.postponePrompt', { count: daysLeft })}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors"
                >
                  {t('home.examCountdown.editDate')}
                </button>
                <button
                  onClick={dismissPostponePrompt}
                  className="px-2 py-1.5 text-white/70 hover:text-white text-xs"
                >
                  {t('home.examCountdown.keepDate')}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/15">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-medium opacity-70">{t('home.examCountdown.targetScoreLabel')}</span>
              <div className="flex gap-1.5">
                {BANDS.map(band => (
                  <button
                    key={band}
                    onClick={() => selectBand(band)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                      targetBand === band
                        ? 'bg-white text-blue-600 border-white'
                        : 'border-white/30 text-white/80 hover:border-white/60'
                    }`}
                  >
                    {t('home.examCountdown.ieltsBand', { band })}
                  </button>
                ))}
              </div>
            </div>

            {targets && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                <ScoreChip label={t('home.examCountdown.skills.speaking')} value={targets.speaking} />
                <ScoreChip label={t('home.examCountdown.skills.writing')} value={targets.writing} />
                <ScoreChip label={t('home.examCountdown.skills.reading')} value={targets.reading} />
                <ScoreChip label={t('home.examCountdown.skills.listening')} value={targets.listening} />
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

function ScoreChip({ label, value }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 text-center
      transition-transform duration-150 hover:scale-[1.04] hover:bg-white/15">
      <div className="text-[10px] opacity-70">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}
