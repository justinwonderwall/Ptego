import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

const SECTION_COLORS = {
  Speaking: 'bg-blue-50   text-blue-600   dark:bg-blue-900/30   dark:text-blue-300',
  Writing:  'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  Reading:  'bg-teal-50   text-teal-600   dark:bg-teal-900/30   dark:text-teal-300',
  Listening:'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

const FILTER_VALUES = ['all', 'due', 'mastered', 'important'];

const scoreColor = (pct) =>
  pct >= 70 ? 'text-green-500' : pct >= 50 ? 'text-orange-500' : 'text-red-500';

const today = () => new Date().toISOString().slice(0, 10);

export default function MistakeBook({ onChange }) {
  const { t } = useTranslation();
  const FILTERS = FILTER_VALUES.map(value => ({
    value,
    label: value === 'all' ? t('common.all')
      : value === 'due' ? t('mistakeFilters.due')
      : value === 'important' ? t('mistakeFilters.important')
      : t('mastery.mastered'),
  }));
  const [rows, setRows]     = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const copyQuestionNo = (id, questionNo) => {
    navigator.clipboard?.writeText(String(questionNo)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    });
  };

  const load = () => {
    setLoading(true);
    api.getMistakes({}).then(setRows).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markMastered = async (id) => {
    await api.markMistakeMastered(id);
    load();
    onChange?.();
  };

  const toggleImportant = async (row) => {
    const next = !row.important;
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, important: next } : r));
    try {
      await api.toggleMistakeImportant(row.id, next);
    } catch {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, important: row.important } : r));
    }
  };

  const handleDelete = async () => {
    await api.deleteMistake(deleteId);
    setDeleteId(null);
    load();
    onChange?.();
  };

  const visible = rows.filter(r => {
    if (filter === 'due') return !r.mastered && r.next_review && r.next_review <= today();
    if (filter === 'mastered') return !!r.mastered;
    if (filter === 'important') return !!r.important;
    return true;
  });

  if (!loading && rows.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">🎯</div>
        <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">{t('review.mistakeBook.emptyTitle')}</p>
        <p className="text-slate-400 text-sm">{t('review.mistakeBook.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400">{t('review.mistakeBook.totalCount', { count: visible.length })}</p>

      {loading ? (
        <div className="text-center text-slate-400 py-12">{t('common.loading')}</div>
      ) : visible.length === 0 ? (
        <div className="text-center text-slate-400 py-12">{t('review.mistakeBook.noMatch')}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700/70
          shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_28px_-16px_rgb(15_23_42/0.16)]
          dark:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_14px_32px_-18px_rgb(0_0_0/0.6)]">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-8" />
              <col className="w-[170px]" />
              <col className="w-[80px]" />
              <col />
              <col className="w-[100px] hidden md:table-column" />
              <col className="w-[76px]" />
              <col className="w-[80px]" />
            </colgroup>
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-1 py-2"></th>
                <th className="px-3 py-2 text-left font-medium">{t('review.mistakeBook.columns.type')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('review.mistakeBook.columns.questionNo')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('review.mistakeBook.columns.practiceRecord')}</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">{t('review.mistakeBook.columns.nextReview')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('review.mistakeBook.columns.status')}</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
              {visible.map(row => {
                const isDue = !row.mastered && row.next_review && row.next_review <= today();
                return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-1 py-2 whitespace-nowrap">
                      <button
                        onClick={() => toggleImportant(row)}
                        aria-label={row.important ? t('common.unmarkImportant') : t('common.markImportant')}
                        className={`text-sm leading-none transition-colors ${row.important ? 'text-amber-400 hover:text-amber-500' : 'text-slate-200 hover:text-amber-300 dark:text-slate-600'}`}
                      >
                        {row.important ? '★' : '☆'}
                      </button>
                    </td>
                    <td className="px-3 py-2 overflow-hidden">
                      <span
                        title={row.task_name}
                        className={`inline-block max-w-full truncate align-bottom text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${SECTION_COLORS[row.task_section] || 'bg-slate-100 text-slate-500'}`}
                      >
                        {row.task_name}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 truncate">
                      <button
                        onClick={() => copyQuestionNo(row.id, row.question_no)}
                        title={t('review.mistakeBook.copyTitle')}
                        className="hover:text-blue-500 transition-colors cursor-pointer"
                      >
                        #{row.question_no}{copiedId === row.id && <span className="text-green-500 text-[10px] ml-1">{t('review.mistakeBook.copied')}</span>}
                      </button>
                    </td>
                    <td className="px-3 py-2 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-x-1 text-xs">
                        {row.attempts.map((a, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span className="text-slate-300 dark:text-slate-600">→</span>}
                            <span className={scoreColor(a.score_pct)}>{a.score_pct}%</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap hidden md:table-cell">
                      {row.mastered ? (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        <span className={isDue ? 'text-red-500 font-medium' : 'text-slate-400'}>
                          {row.next_review}{isDue && ` ${t('review.mistakeBook.dueSuffix')}`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.mastered
                        ? <span className="text-[10px] bg-green-50 text-green-500 border border-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">{t('mastery.mastered')}</span>
                        : <span className="text-[10px] bg-blue-50 text-blue-500 border border-blue-100 px-1.5 py-0.5 rounded-full whitespace-nowrap dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">{t('mastery.learning')}</span>
                      }
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex gap-0.5">
                        {!row.mastered && (
                          <button onClick={() => markMastered(row.id)} className="p-1.5 text-slate-400 hover:text-green-500 transition-colors rounded" title={t('review.mistakeBook.markMasteredTitle')}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                        <button onClick={() => setDeleteId(row.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded" title={t('common.delete')}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-72 text-center space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-medium text-slate-900 dark:text-slate-100">{t('review.mistakeBook.deleteConfirmTitle')}</p>
            <p className="text-sm text-slate-400">{t('common.confirmDeleteHint')}</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">{t('common.delete')}</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
