import React from 'react';

// Lets you jump straight from one note/template to another without going
// back to the list first — scoped to whichever type (学习笔记/模板) is
// currently open, since the two are conceptually separate collections.
export default function ArticleListNav({ list, active, typeLabel, onSelect }) {
  const items = list.filter(item => (item.type || 'template') === active.type);
  if (items.length < 1) return null;

  return (
    <nav className="w-52 shrink-0 max-h-[50vh] overflow-y-auto pr-2">
      <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
        {typeLabel}
      </div>
      <ul className="space-y-0.5">
        {items.map(item => (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item)}
              title={item.title}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm truncate transition-colors ${
                item.id === active.id
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/25 dark:text-blue-400 font-medium'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5'
              }`}
            >
              {item.title || '（无标题）'}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
