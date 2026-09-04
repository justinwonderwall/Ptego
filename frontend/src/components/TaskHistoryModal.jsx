import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function TaskHistoryModal({ task, onClose }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    api.getTaskLogs(task.id).then(setLogs);
  }, [task.id]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{task.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">打卡历史</p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {logs === null ? (
            <div className="text-center text-slate-400 py-10 text-sm">加载中…</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-slate-400 py-10 text-sm">还没有打卡记录</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{log.log_date}</span>
                  <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    <span>{log.count} 题</span>
                    {log.score_pct != null && (
                      <span className="text-blue-500 dark:text-blue-400 font-semibold">{Math.round(log.score_pct)}%</span>
                    )}
                  </div>
                </div>
                {log.note && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{log.note}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
