import React, { useState } from 'react';
import { api } from '../api';
import AccuracyCalculator from './AccuracyCalculator';

// Non-modal floating card (not a full-screen dialog) so the knowledge-entry
// panel next to it stays clickable — you can jot down a knowledge point
// mid check-in without losing your place here.
export default function CheckInModal({ task, onClose, onSuccess }) {
  const [count, setCount] = useState('1');
  const [score, setScore] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCalc, setShowCalc] = useState(false);

  const submit = async () => {
    const n = parseInt(count, 10);
    if (!n || n < 1) { setError('请输入有效题数'); return; }
    const s = score !== '' ? parseFloat(score) : null;
    if (s !== null && (s < 0 || s > 100)) { setError('正确率须在 0–100 之间'); return; }

    setLoading(true);
    setError(null);
    try {
      await api.logPractice({
        task_type_id: task.id,
        count: n,
        score_pct: s,
        note: note.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === 'Enter') submit(); };

  const applyCalculated = (pct) => {
    setScore(String(pct));
    setShowCalc(false);
  };

  return (
    // pr-[31%] approximates the right knowledge-entry column's width (incl. its
    // gap/padding) so the card centers within the left dashboard column only —
    // pointer-events-none on this wrapper keeps the rest of the page clickable,
    // the card itself opts back in.
    <div className="fixed inset-0 z-50 flex items-center justify-center pr-[31%] pointer-events-none">
    <div
      className={`pointer-events-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
        border border-slate-200 dark:border-slate-700 p-7 space-y-4 max-h-[calc(100vh-3rem)] overflow-y-auto
        transition-[width] ${showCalc ? 'w-[480px]' : 'w-96'}`}
    >
      {showCalc ? (
        <AccuracyCalculator onApply={applyCalculated} onCancel={() => setShowCalc(false)} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{task.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">今日已完成 {task.done_today || 0} / 目标 {task.daily_target}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="关闭"
              className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300 text-xl leading-none shrink-0"
            >
              ×
            </button>
          </div>

          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">
              完成题数 <span className="text-red-400">*</span>
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
                正确率 % <span className="text-slate-400 text-xs">（可选，用于趋势图）</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCalc(true)}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium shrink-0 ml-2"
              >
                🧮 计算工具
              </button>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="0 – 100"
              value={score}
              onChange={e => setScore(e.target.value)}
              onKeyDown={handleKey}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">
              备注 <span className="text-slate-400 text-xs">（可选）</span>
            </label>
            <input
              type="text"
              placeholder="今天的状态、遇到的问题…"
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
              {loading ? '提交中…' : '打卡'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
