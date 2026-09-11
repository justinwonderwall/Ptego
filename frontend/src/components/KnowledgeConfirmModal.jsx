import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

const CAT_VALUES = ['grammar', 'word_sense', 'collocation', 'polysemy'];

const CAT_COLORS = {
  grammar:      'bg-blue-50  text-blue-600  dark:bg-blue-900/30  dark:text-blue-300',
  word_sense:   'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  collocation:  'bg-teal-50  text-teal-600  dark:bg-teal-900/30  dark:text-teal-300',
  polysemy:     'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

// Shows one extracted knowledge point at a time — a shared scrollable list of
// cards used to freeze the page whenever a spelling-warning banner pushed a
// card's height around mid-scroll, and its overlapping delete "×" made it
// too easy to nuke a whole entry while trying to dismiss the warning. Paging
// one card at a time removes both problems: there's nothing to scroll, and
// deletion lives in the footer as an explicit labeled action.
export default function KnowledgeConfirmModal({ points, onBack, onConfirmed }) {
  const { t } = useTranslation();
  const CATEGORIES = CAT_VALUES.map(value => ({ value, label: t(`categories.${value}`) }));
  const [rows, setRows] = useState(() => points.map((p, i) => ({ ...p, _key: i })));
  const [idx, setIdx] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState(null);

  const clampIdx = (i, len) => Math.max(0, Math.min(i, len - 1));

  const update = (field, value) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const dismissWarning = () =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, _warningDismissed: true } : r));

  const removeCurrent = () => {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next);
    if (next.length === 0) { onConfirmed(confirmedCount); return; }
    setIdx(i => clampIdx(i, next.length));
  };

  const goPrev = () => setIdx(i => Math.max(0, i - 1));
  const goNext = () => setIdx(i => Math.min(rows.length - 1, i + 1));

  const confirmCurrent = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.saveKnowledge([rows[idx]]);
      const next = rows.filter((_, i) => i !== idx);
      setConfirmedCount(c => c + 1);
      setRows(next);
      if (next.length === 0) { onConfirmed(confirmedCount + 1); return; }
      setIdx(i => clampIdx(i, next.length));
    } catch (e) {
      setError(t(`errors.${e.code}`, t('errors.generic')));
    } finally {
      setSaving(false);
    }
  };

  const saveAllRemaining = async () => {
    if (!rows.length) return;
    setSavingAll(true);
    setError(null);
    try {
      await api.saveKnowledge(rows);
      onConfirmed(confirmedCount + rows.length);
    } catch (e) {
      setError(t(`errors.${e.code}`, t('errors.generic')));
      setSavingAll(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 text-center text-slate-300 dark:text-slate-600">
          {t('knowledge.confirmModal.emptyAllDeleted')}
        </div>
      </div>
    );
  }

  const row = rows[idx];
  const busy = saving || savingAll;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">{t('knowledge.confirmModal.title')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('knowledge.confirmModal.subtitle', { count: rows.length + confirmedCount })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={goPrev}
              disabled={idx === 0}
              aria-label={t('knowledge.confirmModal.prevAria')}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600
                text-slate-500 dark:text-slate-400 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>
            <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
              {t('knowledge.confirmModal.entryProgress', { current: idx + 1, total: rows.length })}
            </span>
            <button
              onClick={goNext}
              disabled={idx === rows.length - 1}
              aria-label={t('knowledge.confirmModal.nextAria')}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600
                text-slate-500 dark:text-slate-400 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        {/* Current entry */}
        <div className="px-6 py-4 space-y-2">
          {row.input_check && !row._warningDismissed && (
            <div className="relative bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 pr-8 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ {row.input_check}
              <button
                onClick={dismissWarning}
                aria-label={t('common.close')}
                className="absolute top-1.5 right-1.5 text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 text-base leading-none transition-colors"
              >
                ×
              </button>
            </div>
          )}

          {/* Row 1: category + term */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('knowledge.fields.category')}</label>
              <select
                value={row.category}
                onChange={e => update('category', e.target.value)}
                className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                  dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('knowledge.fields.termEn')}</label>
              <input
                value={row.term_en || ''}
                onChange={e => update('term_en', e.target.value)}
                className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                  dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 font-medium"
              />
            </div>
          </div>

          {/* Row 2: meaning */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('knowledge.fields.meaningZh')}</label>
            <input
              value={row.meaning_zh || ''}
              onChange={e => update('meaning_zh', e.target.value)}
              className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Row 3: example */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('knowledge.fields.example')}</label>
            <input
              value={row.usage_example || ''}
              onChange={e => update('usage_example', e.target.value)}
              className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 text-slate-500"
            />
          </div>

          {/* Row 4: study note */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('knowledge.fields.studyNote')}</label>
            <textarea
              value={row.study_note || ''}
              onChange={e => update('study_note', e.target.value)}
              rows={2}
              className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 text-slate-500 resize-none"
            />
          </div>

          {/* Category badge */}
          <div className="flex">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[row.category] || ''}`}>
              {CATEGORIES.find(c => c.value === row.category)?.label || row.category}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onBack}
              disabled={busy}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm
                text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              {t('knowledge.confirmModal.backToEdit')}
            </button>
            <button
              onClick={removeCurrent}
              disabled={busy}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm
                text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
            >
              {t('knowledge.confirmModal.skipEntry')}
            </button>
            <button
              onClick={confirmCurrent}
              disabled={busy}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t('knowledge.saving') : t('knowledge.confirmModal.confirmEntry')}
            </button>
          </div>
          {rows.length > 1 && (
            <button
              onClick={saveAllRemaining}
              disabled={busy}
              className="w-full text-xs text-slate-400 hover:text-blue-500 disabled:opacity-40 transition-colors"
            >
              {savingAll ? t('knowledge.saving') : t('knowledge.confirmModal.saveAllRemaining', { count: rows.length })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
