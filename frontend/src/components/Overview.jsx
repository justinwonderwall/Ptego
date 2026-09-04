import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import KnowledgeEditModal from './KnowledgeEditModal';
import KnowledgeDetailModal from './KnowledgeDetailModal';

const CATS = [
  { value: '',             label: '全部' },
  { value: 'grammar',     label: '语法' },
  { value: 'word_sense',  label: '词义辨析' },
  { value: 'collocation', label: '固定搭配' },
  { value: 'polysemy',    label: '多义词' },
];

const CAT_COLORS = {
  grammar:      'bg-blue-50   text-blue-600   dark:bg-blue-900/30   dark:text-blue-300',
  word_sense:   'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  collocation:  'bg-teal-50   text-teal-600   dark:bg-teal-900/30   dark:text-teal-300',
  polysemy:     'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function Overview() {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [category, setCat]    = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [deleteId, setDeleteId]   = useState(null);
  const searchTimer = useRef(null);
  const PAGE_SIZE = 20;

  const load = async (p, cat, q) => {
    setLoading(true);
    try {
      const params = { page: p };
      if (cat) params.category = cat;
      if (q)   params.search   = q;
      const data = await api.getKnowledge(params);
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, '', ''); }, []);

  const changeCategory = (cat) => {
    setCat(cat); setPage(1);
    load(1, cat, search);
  };

  const changeSearch = (q) => {
    setSearch(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(1, category, q); }, 300);
  };

  const changePage = (p) => { setPage(p); load(p, category, search); };

  const handleDelete = async () => {
    await api.deleteKnowledge(deleteId);
    setDeleteId(null);
    load(page, category, search);
  };

  const handleSaved = () => { setEditItem(null); load(page, category, search); };

  const playAudio = (url) => { if (url) new Audio(url).play().catch(() => {}); };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Empty state (no data at all)
  if (!loading && total === 0 && !category && !search) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">📚</div>
        <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">还没有知识点</p>
        <p className="text-slate-400 text-sm">回到首页，点击右下角 + 录入第一条</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
        </div>
        <div className="relative sm:ml-auto">
          <input
            type="text"
            placeholder="搜索英文或中文…"
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

      <p className="text-xs text-slate-400">共 {total} 个知识点</p>

      {/* Table */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">加载中…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-slate-400 py-12">没有匹配的知识点</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-3 py-2.5 text-left font-medium">分类</th>
                <th className="px-3 py-2.5 text-left font-medium hidden lg:table-cell">标签</th>
                <th className="px-3 py-2.5 text-left font-medium">英文</th>
                <th className="px-3 py-2.5 text-left font-medium">中文解释</th>
                <th className="px-3 py-2.5 text-left font-medium hidden md:table-cell">音标</th>
                <th className="px-3 py-2.5 text-left font-medium hidden md:table-cell">下次复习</th>
                <th className="px-3 py-2.5 text-left font-medium">状态</th>
                <th className="px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
              {rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => setDetailItem(row)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                >
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${CAT_COLORS[row.category] || 'bg-slate-100 text-slate-500'}`}>
                      {CATS.find(c => c.value === row.category)?.label || row.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <div className="flex gap-1">
                      {row.skill_tags?.map(tag => (
                        <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.term_en}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">{row.meaning_zh}</td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">{row.phonetic}</span>
                      {row.audio_url && (
                        <button onClick={e => { e.stopPropagation(); playAudio(row.audio_url); }} className="text-slate-300 hover:text-blue-500 transition-colors text-sm">🔊</button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap hidden md:table-cell">{row.next_review}</td>
                  <td className="px-3 py-2.5">
                    {row.mastered
                      ? <span className="text-[10px] bg-green-50 text-green-500 border border-green-100 px-1.5 py-0.5 rounded-full dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">已毕业</span>
                      : <span className="text-[10px] bg-blue-50 text-blue-500 border border-blue-100 px-1.5 py-0.5 rounded-full dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">学习中</span>
                    }
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setEditItem(row); }} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded" title="编辑">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteId(row.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded" title="删除">
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
            <p className="font-medium text-slate-900 dark:text-slate-100">确认删除？</p>
            <p className="text-sm text-slate-400">此操作无法撤销</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">删除</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
