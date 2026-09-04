import React, { useState } from 'react';

const numOnly = (v) => v.replace(/[^\d]/g, '');
const DEFAULT_GROUPS = 3;
const MAX_GROUPS = 30; // sanity cap — a huge 完成题数 shouldn't blow up the table

const initialColumns = (initialGroups) => {
  const n = Math.min(MAX_GROUPS, Math.max(1, parseInt(initialGroups, 10) || DEFAULT_GROUPS));
  return Array.from({ length: n }, () => ({ correct: '', wrong: '' }));
};

export default function AccuracyCalculator({ onApply, onCancel, initialGroups }) {
  // Matches the 完成题数 the user already typed in — one group per question
  // by default, so they're not stuck manually clicking "+ 添加一组" to catch up.
  const [cols, setCols] = useState(() => initialColumns(initialGroups));

  const update = (idx, field, value) =>
    setCols(prev => prev.map((c, i) => (i === idx ? { ...c, [field]: numOnly(value) } : c)));

  const addCol = () => setCols(prev => [...prev, { correct: '', wrong: '' }]);
  const removeCol = (idx) => setCols(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const totalCorrect = cols.reduce((s, c) => s + (parseInt(c.correct, 10) || 0), 0);
  const totalWrong   = cols.reduce((s, c) => s + (parseInt(c.wrong, 10) || 0), 0);
  const total = totalCorrect + totalWrong;
  const pct = total > 0 ? Math.round((totalCorrect / total) * 1000) / 10 : null;

  const apply = () => {
    if (pct === null) return;
    onApply(pct);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">正确率计算工具</h3>
        <p className="text-xs text-slate-400 mt-0.5">按每组题目分别填写正确 / 错误题数，可累加多组</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50">
              <th className="px-2 py-1.5 w-14" />
              {cols.map((_, i) => (
                <th key={i} className="px-1 py-1.5 text-center text-xs font-medium text-slate-400 relative">
                  第{i + 1}组
                  {cols.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCol(i)}
                      className="absolute top-0.5 right-0.5 text-slate-300 hover:text-red-400 text-xs leading-none"
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100 dark:border-slate-700">
              <td className="px-2 py-1.5 text-xs font-medium text-green-600 dark:text-green-400">正确</td>
              {cols.map((c, i) => (
                <td key={i} className="p-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={c.correct}
                    onChange={e => update(i, 'correct', e.target.value)}
                    className="w-14 text-center border border-slate-200 dark:border-slate-600 rounded px-1 py-1 text-sm
                      dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
                  />
                </td>
              ))}
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-700">
              <td className="px-2 py-1.5 text-xs font-medium text-red-500 dark:text-red-400">错误</td>
              {cols.map((c, i) => (
                <td key={i} className="p-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={c.wrong}
                    onChange={e => update(i, 'wrong', e.target.value)}
                    className="w-14 text-center border border-slate-200 dark:border-slate-600 rounded px-1 py-1 text-sm
                      dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addCol} className="text-xs text-blue-500 hover:text-blue-600 font-medium">
        + 添加一组
      </button>

      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2.5 flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          共 {total} 题 · 正确 {totalCorrect} · 错误 {totalWrong}
        </span>
        <span className="font-bold text-blue-600 dark:text-blue-400 text-base tabular-nums">
          {pct !== null ? `${pct}%` : '--'}
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={apply}
          disabled={pct === null}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          计算并返回
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm
            text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          返回
        </button>
      </div>
    </div>
  );
}
