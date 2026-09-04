import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import RichEditor from '../components/RichEditor';

const TABS = [
  { key: 'note',     label: '学习笔记', newLabel: '+ 新增笔记',   emptyTitle: '还没有学习笔记', emptyHint: '点击右上角"新增笔记"，记录你总结的做题技巧' },
  { key: 'template', label: '模板',    newLabel: '+ 新增模板',   emptyTitle: '还没有模板',    emptyHint: '点击右上角"新增模板"，记录你的备考套路、DI 案例等' },
];

// textContent both strips tags and decodes entities (&nbsp; etc.) in one
// pass — a regex replace would leave entities like &nbsp; as literal text.
const stripHtml = (html) => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
};

const formatDate = (iso) => {
  if (!iso) return '';
  // sqlite datetime('now') is UTC without a timezone suffix — treat it as such.
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function Notes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('note');
  const [active, setActive] = useState(null); // null | { id: number|'new', title, content, type }
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return api.getTemplates().then(setList).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => setActive({ id: 'new', title: '', content: '', type: tab });
  const openExisting = (item) => setActive({ ...item });
  const back = () => setActive(null);

  const activeMeta = TABS.find(t => t.key === (active?.type || tab));
  const label = activeMeta?.label || '笔记';

  const save = async () => {
    if (!active.title.trim()) { alert('请输入标题'); return; }
    setSaving(true);
    try {
      if (active.id === 'new') {
        const saved = await api.createTemplate({ title: active.title, content: active.content, type: active.type });
        setActive(saved);
      } else {
        const saved = await api.updateTemplate(active.id, { title: active.title, content: active.content, type: active.type });
        setActive(saved);
      }
      await load();
    } catch (e) {
      alert('保存失败：' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    await api.deleteTemplate(deleteId);
    setDeleteId(null);
    if (active?.id === deleteId) setActive(null);
    load();
  };

  if (active) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={back}
          className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 mb-4 flex items-center gap-1"
        >
          ← 返回列表
        </button>

        <div className="flex items-center gap-1.5 mb-3">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(a => ({ ...a, type: t.key }))}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                active.type === t.key
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          value={active.title}
          onChange={e => setActive(a => ({ ...a, title: e.target.value }))}
          placeholder={activeMeta?.key === 'note' ? '笔记标题…' : '模板标题…'}
          className="w-full text-2xl font-bold text-slate-900 dark:text-slate-100 bg-transparent border-0 border-b-2
            border-transparent focus:border-blue-400 focus:outline-none pb-2 mb-4 placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />

        <RichEditor
          editorKey={active.id}
          initialContent={active.content}
          onChange={html => setActive(a => ({ ...a, content: html }))}
        />

        <div className="flex items-center justify-between mt-4">
          <div>
            {active.id !== 'new' && (
              <button
                onClick={() => setDeleteId(active.id)}
                className="text-sm text-red-400 hover:text-red-500 font-medium"
              >
                删除{label}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {active.updated_at && (
              <span className="text-xs text-slate-400">最后保存：{formatDate(active.updated_at)}</span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold
                disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>

        {deleteId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-72 text-center space-y-4" onClick={e => e.stopPropagation()}>
              <p className="font-medium text-slate-900 dark:text-slate-100">确认删除该{label}？</p>
              <p className="text-sm text-slate-400">此操作无法撤销</p>
              <div className="flex gap-2">
                <button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">删除</button>
                <button onClick={() => setDeleteId(null)} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">取消</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const filtered = list.filter(item => (item.type || 'template') === tab);
  const activeTabMeta = TABS.find(t => t.key === tab);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={openNew}
          className="mb-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {activeTabMeta.newLabel}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-20">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">{activeTabMeta.emptyTitle}</p>
          <p className="text-slate-400 text-sm">{activeTabMeta.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => openExisting(item)}
              className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80
                shadow-sm hover:border-blue-200 dark:hover:border-blue-800 transition-colors px-5 py-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</h3>
                <span className="text-xs text-slate-400 shrink-0">{formatDate(item.updated_at)}</span>
              </div>
              {stripHtml(item.content) && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {stripHtml(item.content)}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
