import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

const SECTIONS = ['Speaking', 'Writing', 'Reading', 'Listening'];

export default function TaskSettingsModal({ onClose, onSaved }) {
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState({});   // { id: { daily_target, archived } }

  useEffect(() => {
    // Load all task types including archived
    fetch('/api/task-types?includeArchived=1')
      .then(r => r.json())
      .then(setTasks);
  }, []);

  const patch = (id, field, value) => {
    setChanged(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(changed).map(([id, updates]) =>
          api.updateTaskType(Number(id), updates)
        )
      );
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const bySection = SECTIONS.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.section === s);
    return acc;
  }, {});

  // Portaled to <body>: DailyPlan's card-surface ancestor uses backdrop-filter,
  // which turns it into the containing block for `fixed` descendants — without
  // the portal this modal shrinks to the card's box instead of the viewport.
  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">编辑打卡计划</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {SECTIONS.map(section => {
            const sectionTasks = bySection[section] || [];
            if (!sectionTasks.length) return null;
            return (
              <div key={section}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {section}
                </h3>
                <div className="space-y-2">
                  {sectionTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3">
                      {/* Toggle active/archived */}
                      <input
                        type="checkbox"
                        checked={!task.archived}
                        onChange={e => patch(task.id, 'archived', e.target.checked ? 0 : 1)}
                        className="w-4 h-4 accent-blue-500 shrink-0 cursor-pointer"
                      />
                      {/* Task name */}
                      <span
                        className={`flex-1 text-sm min-w-0 ${
                          task.archived
                            ? 'text-slate-300 dark:text-slate-600 line-through'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {task.name}
                      </span>
                      {/* Daily target */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-slate-400">每日</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={task.daily_target}
                          disabled={!!task.archived}
                          onChange={e =>
                            patch(task.id, 'daily_target', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-16 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm text-center
                            dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400
                            disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-slate-400">题</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={save}
            disabled={saving || Object.keys(changed).length === 0}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '保存中…' : '保存'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
