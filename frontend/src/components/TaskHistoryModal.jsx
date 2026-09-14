import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

export default function TaskHistoryModal({ task, onClose, onChange }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = () => api.getTaskLogs(task.id).then(setLogs);

  useEffect(() => { load(); }, [task.id]);

  const handleDelete = async () => {
    await api.deletePracticeLog(deleteId);
    setDeleteId(null);
    load();
    onChange?.();
  };

  // Portaled to <body>: DailyPlan's card-surface ancestor uses backdrop-filter,
  // which turns it into the containing block for `fixed` descendants — without
  // the portal this modal shrinks to the card's box instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{task.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t('taskHistory.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {logs === null ? (
            <div className="text-center text-slate-400 py-10 text-sm">{t('common.loading')}</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-slate-400 py-10 text-sm">{t('taskHistory.empty')}</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="group border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{log.log_date}</span>
                  <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    <span>{log.count} {t('taskHistory.questionUnit')}</span>
                    {log.score_pct != null && (
                      <span className="text-blue-500 dark:text-blue-400 font-semibold">{Math.round(log.score_pct)}%</span>
                    )}
                    <button
                      onClick={() => setDeleteId(log.id)}
                      title={t('taskHistory.deleteEntryTitle')}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-opacity leading-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                {log.note && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{log.note}</p>
                )}
              </div>
            ))
          )}
        </div>

        {deleteId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => setDeleteId(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-72 text-center space-y-4" onClick={e => e.stopPropagation()}>
              <p className="font-medium text-slate-900 dark:text-slate-100">{t('taskHistory.deleteConfirmTitle')}</p>
              <p className="text-sm text-slate-400">{t('common.confirmDeleteHint')}</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">{t('common.delete')}</button>
                <button onClick={() => setDeleteId(null)} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
