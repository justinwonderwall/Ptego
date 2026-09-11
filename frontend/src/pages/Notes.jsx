import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import MarkdownEditor from '../components/MarkdownEditor';
import ArticleToc from '../components/ArticleToc';
import ArticleListNav from '../components/ArticleListNav';
import { exportToDocx, exportToPdf } from '../utils/exportDoc';

const TAB_KEYS = ['note', 'template'];

// Strips both leftover HTML (older notes saved before the markdown editor)
// and common Markdown syntax markers, for a plain-text list preview.
const stripFormatting = (raw) => {
  if (!raw) return '';
  const div = document.createElement('div');
  div.innerHTML = raw;
  return (div.textContent || raw)
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')  // markdown images
    .replace(/[#>*_`~-]/g, '')            // markdown syntax markers
    .replace(/\s+/g, ' ')
    .trim();
};

const formatDate = (iso) => {
  if (!iso) return '';
  // sqlite datetime('now') is UTC without a timezone suffix — treat it as such.
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function Notes() {
  const { t } = useTranslation();
  const TABS = TAB_KEYS.map(key => ({
    key,
    label: t(`notes.tabs.${key}.label`),
    newLabel: t(`notes.tabs.${key}.newLabel`),
    emptyTitle: t(`notes.tabs.${key}.emptyTitle`),
    emptyHint: t(`notes.tabs.${key}.emptyHint`),
  }));
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('note');
  const [active, setActive] = useState(null); // null | { id: number|'new', title, content, type, updated_at? }
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [exportOpen]);

  const load = useCallback(() => {
    setLoading(true);
    return api.getTemplates().then(setList).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setActive({ id: 'new', title: '', content: '', type: tab }); setMode('edit'); };
  const openExisting = (item) => { setActive({ ...item }); setMode('view'); };
  const back = () => setActive(null);

  const activeMeta = TABS.find(tb => tb.key === (active?.type || tab));
  const label = activeMeta?.label || t('notes.defaultLabel');

  const publish = async () => {
    if (!active.title.trim()) { alert(t('notes.titleRequiredAlert')); return; }
    setSaving(true);
    try {
      const saved = active.id === 'new'
        ? await api.createTemplate({ title: active.title, content: active.content, type: active.type })
        : await api.updateTemplate(active.id, { title: active.title, content: active.content, type: active.type });
      setActive(saved);
      setMode('view');
      await load();
    } catch (e) {
      alert(t('notes.saveFailedAlert', { message: e.message }));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (active.id === 'new') { back(); return; }
    const saved = list.find(item => item.id === active.id);
    if (saved) setActive({ ...saved });
    setMode('view');
  };

  const runExport = async (format) => {
    setExportOpen(false);
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const exportTitle = active.title || t('notes.untitled');
      if (format === 'docx') await exportToDocx(exportTitle, contentRef.current);
      else exportToPdf(exportTitle, contentRef.current);
    } catch (e) {
      alert(t('notes.exportFailedAlert', { message: e.message }));
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = async () => {
    await api.deleteTemplate(deleteId);
    setDeleteId(null);
    if (active?.id === deleteId) setActive(null);
    load();
  };

  if (active) {
    const editing = mode === 'edit';
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={back}
            className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1"
          >
            {t('notes.backToList')}
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={exporting}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300
                hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {exporting ? t('notes.exporting') : t('notes.export')}
              <span className="text-[10px] text-slate-400">▾</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden z-10">
                <button
                  onClick={() => runExport('pdf')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('notes.exportPdf')}
                </button>
                <button
                  onClick={() => runExport('docx')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('notes.exportWord')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-8">
        <div className="hidden lg:flex flex-col gap-6 shrink-0 sticky top-6 self-start">
          <ArticleListNav list={list} active={active} typeLabel={label} onSelect={openExisting} />
          <ArticleToc containerRef={contentRef} watch={`${active.id}-${mode}-${active.content}`} />
        </div>
        <div className="flex-1 min-w-0 max-w-4xl">

        {editing ? (
          <div className="flex items-center gap-1.5 mb-3">
            {TABS.map(tb => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setActive(a => ({ ...a, type: tb.key }))}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  active.type === tb.key
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-300'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
        ) : (
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${
            active.type === 'note'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300'
          }`}>
            {label}
          </span>
        )}

        {editing ? (
          <input
            value={active.title}
            onChange={e => setActive(a => ({ ...a, title: e.target.value }))}
            placeholder={active.type === 'note' ? t('notes.titlePlaceholderNote') : t('notes.titlePlaceholderTemplate')}
            className="w-full text-2xl font-bold text-slate-900 dark:text-slate-100 bg-transparent border-0 border-b-2
              border-transparent focus:border-blue-400 focus:outline-none pb-2 mb-4 placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        ) : (
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 pb-1">{active.title}</h1>
        )}

        {!editing && (
          <div className="flex items-center gap-2.5 text-xs text-slate-400 dark:text-slate-500 mb-5">
            <button
              onClick={() => setMode('edit')}
              className="font-medium text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              {t('common.edit')}
            </button>
            {active.updated_at && (
              <>
                <span className="text-slate-200 dark:text-slate-700">·</span>
                <span>{t('notes.lastSaved', { date: formatDate(active.updated_at) })}</span>
              </>
            )}
            <span className="text-slate-200 dark:text-slate-700">·</span>
            <button
              onClick={() => setDeleteId(active.id)}
              className="font-medium text-red-400 hover:text-red-500 transition-colors"
            >
              {t('notes.deleteArticle')}
            </button>
          </div>
        )}

        <div ref={contentRef}>
          <MarkdownEditor
            editorKey={`${active.id}-${mode}`}
            markdown={active.content}
            readOnly={!editing}
            onChange={md => setActive(a => ({ ...a, content: md }))}
          />
        </div>

        {editing && (
          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium
                text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={publish}
              disabled={saving}
              className="btn-glow px-5 py-2 text-white rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
            >
              {saving ? t('notes.publishing') : t('notes.publish')}
            </button>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
            <div className="card-surface !bg-white dark:!bg-slate-800 shadow-xl p-6 w-72 text-center space-y-4" onClick={e => e.stopPropagation()}>
              <p className="font-medium text-slate-900 dark:text-slate-100">{t('notes.deleteConfirmTitle')}</p>
              <p className="text-sm text-slate-400">{t('common.confirmDeleteHint')}</p>
              <div className="flex gap-2">
                <button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">{t('common.delete')}</button>
                <button onClick={() => setDeleteId(null)} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        )}
        </div>
        </div>
      </div>
    );
  }

  const filtered = list.filter(item => (item.type || 'template') === tab);
  const activeTabMeta = TABS.find(tb => tb.key === tab);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-0">
          {TABS.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`relative px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === tb.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <button
          onClick={openNew}
          className="btn-glow mb-2 px-4 py-2 text-white rounded-lg text-sm font-semibold"
        >
          {activeTabMeta.newLabel}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-20">{t('common.loading')}</div>
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
              className="card-surface card-interactive w-full text-left hover:border-blue-200/70 dark:hover:border-blue-800/70 px-5 py-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</h3>
                <span className="text-xs text-slate-400 shrink-0">{formatDate(item.updated_at)}</span>
              </div>
              {stripFormatting(item.content) && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {stripFormatting(item.content)}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
