import React, { useState } from 'react';
import { api } from '../api';

const CATEGORIES = [
  { value: 'grammar',      label: '语法' },
  { value: 'word_sense',   label: '词义辨析' },
  { value: 'collocation',  label: '固定搭配' },
  { value: 'polysemy',     label: '多义词' },
];

const CAT_COLORS = {
  grammar:      'bg-blue-50  text-blue-600  dark:bg-blue-900/30  dark:text-blue-300',
  word_sense:   'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  collocation:  'bg-teal-50  text-teal-600  dark:bg-teal-900/30  dark:text-teal-300',
  polysemy:     'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function KnowledgeConfirmModal({ points, onBack, onConfirmed }) {
  const [rows, setRows] = useState(() => points.map((p, i) => ({ ...p, _key: i })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const update = (idx, field, value) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const remove = (idx) =>
    setRows(prev => prev.filter((_, i) => i !== idx));

  const confirm = async () => {
    if (!rows.length) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveKnowledge(rows);
      onConfirmed(rows.length);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">确认知识点</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            AI 提取了 {rows.length} 个知识点，可编辑或删除后入库
          </p>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {rows.length === 0 ? (
            <div className="text-center text-slate-300 dark:text-slate-600 py-12">已删除全部条目</div>
          ) : (
            rows.map((row, idx) => (
              <div
                key={row._key}
                className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-2 relative hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
              >
                {/* Delete */}
                <button
                  onClick={() => remove(idx)}
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-400 text-xl leading-none transition-colors"
                >
                  ×
                </button>

                {/* Input correctness check — flagged by the AI, not a saved field */}
                {row.input_check && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 pr-7">
                    ⚠️ {row.input_check}
                  </div>
                )}

                {/* Row 1: category + term */}
                <div className="grid grid-cols-2 gap-2 pr-7">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">分类</label>
                    <select
                      value={row.category}
                      onChange={e => update(idx, 'category', e.target.value)}
                      className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                        dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">英文词 / 短语</label>
                    <input
                      value={row.term_en || ''}
                      onChange={e => update(idx, 'term_en', e.target.value)}
                      className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                        dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 font-medium"
                    />
                  </div>
                </div>

                {/* Row 2: meaning */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">中文解释</label>
                  <input
                    value={row.meaning_zh || ''}
                    onChange={e => update(idx, 'meaning_zh', e.target.value)}
                    className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                      dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* Row 3: example */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">例句</label>
                  <input
                    value={row.usage_example || ''}
                    onChange={e => update(idx, 'usage_example', e.target.value)}
                    className="w-full mt-0.5 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm
                      dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 text-slate-500"
                  />
                </div>

                {/* Row 4: study note */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">学习笔记</label>
                  <textarea
                    value={row.study_note || ''}
                    onChange={e => update(idx, 'study_note', e.target.value)}
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
            ))
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button
            onClick={onBack}
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            ← 返回修改
          </button>
          <button
            onClick={confirm}
            disabled={saving || rows.length === 0}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '保存中…' : `确认入库（${rows.length}）`}
          </button>
        </div>
      </div>
    </div>
  );
}
