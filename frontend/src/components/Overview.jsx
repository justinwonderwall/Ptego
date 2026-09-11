import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import KnowledgeEditModal from './KnowledgeEditModal';
import KnowledgeDetailModal from './KnowledgeDetailModal';

const CAT_VALUES = ['', 'grammar', 'word_sense', 'collocation', 'polysemy'];

const CAT_COLORS = {
  grammar:      'bg-blue-50   text-blue-600   dark:bg-blue-900/30   dark:text-blue-300',
  word_sense:   'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  collocation:  'bg-teal-50   text-teal-600   dark:bg-teal-900/30   dark:text-teal-300',
  polysemy:     'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

const VOCAB_VALUES = ['', 'pronunciation', 'spelling', 'reading'];

export default function Overview() {
  const { t } = useTranslation();
  const CATS = CAT_VALUES.map(value => ({ value, label: value ? t(`categories.${value}`) : t('common.all') }));
  const VOCAB_TYPES = VOCAB_VALUES.map(value => ({ value, label: value ? t(`vocabTypes.${value}`) : t('vocabTypes.all') }));
  const VOCAB_LABELS = { pronunciation: t('vocabTypes.pronunciation'), spelling: t('vocabTypes.spelling'), reading: t('vocabTypes.reading') };
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [category, setCat]    = useState('');
  const [vocabType, setVocabType] = useState('');
  const [search, setSearch]   = useState('');
  const [importantOnly, setImportantOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [deleteId, setDeleteId]   = useState(null);
  const searchTimer = useRef(null);
  const PAGE_SIZE = 20;

  const load = async (p, cat, vType, q, important) => {
    setLoading(true);
    try {
      const params = { page: p };
      if (cat)   params.category   = cat;
      if (vType) params.vocab_type = vType;
      if (q)     params.search     = q;
      if (important) params.important = '1';
      const data = await api.getKnowledge(params);
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, '', '', '', false); }, []);

  const changeCategory = (cat) => {
    setCat(cat); setPage(1);
    load(1, cat, vocabType, search, importantOnly);
  };

  const changeVocabType = (vType) => {
    setVocabType(vType); setPage(1);
    load(1, category, vType, search, importantOnly);
  };

  const changeSearch = (q) => {
    setSearch(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(1, category, vocabType, q, importantOnly); }, 300);
  };

  const toggleImportantFilter = () => {
    const next = !importantOnly;
    setImportantOnly(next); setPage(1);
    load(1, category, vocabType, search, next);
  };

  const changePage = (p) => { setPage(p); load(p, category, vocabType, search, importantOnly); };

  const toggleImportant = async (row) => {
    const next = !row.important;
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, important: next } : r));
    try {
      await api.updateKnowledge(row.id, { important: next });
    } catch {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, important: row.important } : r));
    }
  };

  const handleDelete = async () => {
    await api.deleteKnowledge(deleteId);
    setDeleteId(null);
    load(page, category, vocabType, search);
  };

  const handleSaved = () => { setEditItem(null); load(page, category, vocabType, search); };

  const playAudio = (url) => { if (url) new Audio(url).play().catch(() => {}); };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Empty state (no data at all)
  if (!loading && total === 0 && !category && !vocabType && !search) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">📚</div>
        <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">{t('review.overview.emptyTitle')}</p>
        <p className="text-slate-400 text-sm">{t('review.overview.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {CATS.map(c => (
              <button
                key={c.value}
                onClick={() => changeCategory(c.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  category === c.value
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-300'
                }`}
              >
                {c.label}
              </button>
            ))}
            <button
              onClick={toggleImportantFilter}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                importantOnly
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-amber-300'
              }`}
            >
              {t('common.importantFilter')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VOCAB_TYPES.map(v => (
              <button
                key={v.value}
                onClick={() => changeVocabType(v.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  vocabType === v.value
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-300'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative sm:ml-auto">
          <input
            type="text"
            placeholder={t('review.overview.searchPlaceholder')}
            value={search}
            onChange={e => changeSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm w-52
              dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
          />
          <svg className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <p className="text-xs text-slate-400">{t('review.overview.totalCount', { count: total })}</p>

      {/* Table */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-slate-400 py-12">{t('review.overview.noMatch')}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700/70
          shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_28px_-16px_rgb(15_23_42/0.16)]
          dark:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_14px_32px_-18px_rgb(0_0_0/0.6)]">
          {/* table-fixed + explicit column widths keep every column's content
              on one line, deterministically — an auto-layout table let the
              英文 column's whitespace-nowrap squeeze 状态 down to almost
              nothing, which wrapped 学习中/已毕业 into vertical stacks of
              single characters and blew up the whole row's height. */}
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-8" />
              <col className="w-[88px]" />
              <col className="w-[100px] hidden lg:table-column" />
              <col className="w-[22%]" />
              <col />
              <col className="w-[100px] hidden md:table-column" />
              <col className="w-[92px] hidden md:table-column" />
              <col className="w-[68px]" />
              <col className="w-[64px]" />
            </colgroup>
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-1 py-2"></th>
                <th className="px-3 py-2 text-left font-medium">{t('review.overview.columns.category')}</th>
                <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">{t('review.overview.columns.tags')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('review.overview.columns.english')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('review.overview.columns.chineseMeaning')}</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">{t('review.overview.columns.phonetic')}</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">{t('review.overview.columns.nextReview')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('review.overview.columns.status')}</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
              {rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => setDetailItem(row)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                >
                  <td className="px-1 py-2 whitespace-nowrap">
                    <button
                      onClick={e => { e.stopPropagation(); toggleImportant(row); }}
                      aria-label={row.important ? t('common.unmarkImportant') : t('common.markImportant')}
                      className={`text-sm leading-none transition-colors ${row.important ? 'text-amber-400 hover:text-amber-500' : 'text-slate-200 hover:text-amber-300 dark:text-slate-600'}`}
                    >
                      {row.important ? '★' : '☆'}
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${CAT_COLORS[row.category] || 'bg-slate-100 text-slate-500'}`}>
                      {CATS.find(c => c.value === row.category)?.label || row.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell overflow-hidden">
                    <div className="flex gap-1 flex-nowrap overflow-hidden">
                      {row.vocab_type && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-300 whitespace-nowrap shrink-0">
                          {VOCAB_LABELS[row.vocab_type] || row.vocab_type}
                        </span>
                      )}
                      {row.skill_tags?.map(tag => (
                        <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 truncate">{row.term_en}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate">{row.meaning_zh}</td>
                  <td className="px-3 py-2 hidden md:table-cell overflow-hidden">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 truncate">{row.phonetic}</span>
                      {row.audio_url && (
                        <button onClick={e => { e.stopPropagation(); playAudio(row.audio_url); }} className="text-slate-300 hover:text-blue-500 transition-colors text-sm shrink-0">🔊</button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap hidden md:table-cell">{row.next_review}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.mastered
                      ? <span className="text-[10px] bg-green-50 text-green-500 border border-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">{t('mastery.mastered')}</span>
                      : <span className="text-[10px] bg-blue-50 text-blue-500 border border-blue-100 px-1.5 py-0.5 rounded-full whitespace-nowrap dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">{t('mastery.learning')}</span>
                    }
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setEditItem(row); }} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded" title={t('common.edit')}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteId(row.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded" title={t('common.delete')}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button onClick={() => changePage(page - 1)} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            ←
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p;
            if (totalPages <= 7) p = i + 1;
            else if (page <= 4) p = i + 1;
            else if (page >= totalPages - 3) p = totalPages - 6 + i;
            else p = page - 3 + i;
            if (p < 1 || p > totalPages) return null;
            return (
              <button key={p} onClick={() => changePage(p)}
                className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                  p === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => changePage(page + 1)} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            →
          </button>
        </div>
      )}

      {/* Detail modal */}
      {detailItem && <KnowledgeDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}

      {/* Edit modal */}
      {editItem && <KnowledgeEditModal item={editItem} onClose={() => setEditItem(null)} onSaved={handleSaved} />}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-72 text-center space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-medium text-slate-900 dark:text-slate-100">{t('common.confirmDelete')}</p>
            <p className="text-sm text-slate-400">{t('common.confirmDeleteHint')}</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">{t('common.delete')}</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
