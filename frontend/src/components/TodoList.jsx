import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

export default function TodoList() {
  const { t } = useTranslation();
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api.getTodos().then(setTodos).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const dueCount = useMemo(() => todos.filter(t => !t.done).length, [todos]);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!text.trim() || adding) return;
    setAdding(true);
    try {
      await api.createTodo({ content: text.trim() });
      setText('');
      load();
    } finally {
      setAdding(false);
    }
  };

  const toggleDone = async (todo) => {
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: todo.done ? 0 : 1 } : t));
    await api.updateTodo(todo.id, { done: !todo.done });
    load();
  };

  const removeTodo = async (id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    await api.deleteTodo(id);
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.content);
  };

  const saveEdit = async () => {
    if (!editText.trim()) { setEditingId(null); return; }
    await api.updateTodo(editingId, { content: editText.trim() });
    setEditingId(null);
    load();
  };

  return (
    <div className="card-surface">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t('home.todoList.title')}</h2>
        {dueCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
            bg-red-500 text-white text-[10px] font-bold rounded-full">
            {dueCount > 99 ? '99+' : dueCount}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-2">
        <form onSubmit={addTodo} className="flex items-center gap-1.5">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('home.todoList.addPlaceholder')}
            className="flex-1 min-w-0 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm
              dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
          />
          <button
            type="submit"
            disabled={!text.trim() || adding}
            className="btn-glow shrink-0 w-8 h-8 flex items-center justify-center rounded-lg
              text-white text-lg leading-none disabled:cursor-not-allowed"
          >
            +
          </button>
        </form>

        {todos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">{t('home.todoList.empty')}</p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {todos.map(todo => (
              <li key={todo.id} className="group flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <button
                  onClick={() => toggleDone(todo)}
                  className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-150 ${
                    todo.done
                      ? 'bg-gradient-to-br from-blue-400 to-indigo-500 border-transparent shadow-[0_2px_6px_-1px_rgb(59_130_246/0.6)]'
                      : 'border-slate-300 dark:border-slate-500 hover:border-blue-400 hover:scale-110'
                  }`}
                >
                  {todo.done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>

                {editingId === todo.id ? (
                  <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={saveEdit}
                    className="flex-1 min-w-0 border border-blue-300 rounded px-1.5 py-0.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(todo)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className={`text-sm break-words ${todo.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {todo.content}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => removeTodo(todo.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-opacity px-1"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
