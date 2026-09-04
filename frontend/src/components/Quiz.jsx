import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { ClickableText, DictResultPanel, useDictLookup } from './DictionaryLookup';

const CAT_LABELS = {
  grammar: '语法', word_sense: '词义辨析',
  collocation: '固定搭配', polysemy: '多义词', pronunciation: '发音',
};
const CAT_COLORS = {
  grammar:      'bg-blue-50   text-blue-600   dark:bg-blue-900/30   dark:text-blue-300',
  word_sense:   'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  collocation:  'bg-teal-50   text-teal-600   dark:bg-teal-900/30   dark:text-teal-300',
  polysemy:     'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
  pronunciation:'bg-pink-50   text-pink-600   dark:bg-pink-900/30   dark:text-pink-300',
};

export default function Quiz() {
  const [queue, setQueue]         = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [direction, setDir]       = useState('en-zh'); // 'en-zh' | 'zh-en'
  const [mode, setMode]           = useState('self');  // 'self' | 'input'
  const [inputVal, setInputVal]   = useState('');
  const [inputShown, setInputShown] = useState(false);
  const [grading, setGrading]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [doneCount, setDoneCount] = useState(0);
  const [initialTotal, setInitialTotal] = useState(0);
  const { queriedWord, dict, loading: dictLoading, error: dictError, lookup, reset: resetDict } = useDictLookup();

  useEffect(() => {
    api.getDue().then(rows => {
      setQueue(rows);
      setInitialTotal(rows.length);
      setLoading(false);
    });
  }, []);

  const current = queue[currentIdx];
  const isDone  = !loading && queue.length === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resetDict(); }, [current?.id]);

  const flip = useCallback(() => { setFlipped(true); }, []);

  const grade = useCallback(async (result) => {
    if (!current || grading) return;
    setGrading(true);
    try {
      await api.gradeKP(current.id, result);
      const graded = current;
      setQueue(prev => {
        const next = [...prev];
        next.splice(currentIdx, 1);
        if (result === 'forgot') next.push(graded);
        return next;
      });
      if (result === 'know') setDoneCount(d => d + 1);
      setCurrentIdx(prev => {
        const newLen = result === 'forgot' ? queue.length : queue.length - 1;
        return Math.min(prev, Math.max(0, newLen - 1));
      });
      setFlipped(false);
      setInputVal('');
      setInputShown(false);
    } finally {
      setGrading(false);
    }
  }, [current, currentIdx, grading, queue.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (isDone) return;
      if (e.code === 'Space' && !flipped) { e.preventDefault(); flip(); }
      if (e.key === '1' && flipped) grade('forgot');
      if (e.key === '2' && flipped) grade('know');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flip, grade, flipped, isDone]);

  const playAudio = (url) => { if (url) new Audio(url).play().catch(() => {}); };

  const submitInput = () => {
    if (!inputVal.trim()) return;
    setInputShown(true);
    setFlipped(true);
  };

  const resetDirection = () => { setDir(d => d === 'en-zh' ? 'zh-en' : 'en-zh'); setFlipped(false); setInputVal(''); setInputShown(false); resetDict(); };
  const resetMode = () => { setMode(m => m === 'self' ? 'input' : 'self'); setFlipped(false); setInputVal(''); setInputShown(false); resetDict(); };

  // ── Loading ──
  if (loading) return <div className="text-center text-slate-400 py-20">加载中…</div>;

  // ── Done ──
  if (isDone) return (
    <div className="text-center py-24 space-y-3">
      <div className="text-6xl">🎉</div>
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">今日复习完成！</h3>
      <p className="text-slate-400">共完成 {doneCount} 个知识点</p>
    </div>
  );

  if (!current) return null;

  const front = direction === 'en-zh' ? current.term_en    : current.meaning_zh;
  const back  = direction === 'en-zh' ? current.meaning_zh : current.term_en;
  const progress = initialTotal > 0 ? doneCount / initialTotal : 0;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          待复习 <span className="font-bold text-slate-900 dark:text-white">{queue.length}</span> 个
          {doneCount > 0 && <span className="text-green-500 ml-2">· 已完成 {doneCount}</span>}
        </p>
        <div className="flex gap-1.5">
          <button onClick={resetDirection}
            className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-300 transition-colors">
            {direction === 'en-zh' ? 'EN → 中' : '中 → EN'}
          </button>
          <button onClick={resetMode}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              mode === 'input'
                ? 'border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-300'
            }`}>
            {mode === 'self' ? '自评模式' : '输入模式'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 text-right">{doneCount}/{initialTotal}</p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-64 flex flex-col p-6">
        {/* Card header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[current.category] || 'bg-slate-100 text-slate-500'}`}>
              {CAT_LABELS[current.category] || current.category}
            </span>
            {current.skill_tags?.map(tag => (
              <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {tag}
              </span>
            ))}
          </div>
          <span className="text-xs text-slate-300 dark:text-slate-600">{currentIdx + 1} / {queue.length}</span>
        </div>

        {/* Front */}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-2">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {direction === 'en-zh' ? <ClickableText text={front} onWordClick={lookup} /> : front}
          </p>

          {/* Phonetic always on front when EN side is showing */}
          {((direction === 'en-zh') || (direction === 'zh-en' && flipped)) && current.phonetic && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-slate-400 font-light">{current.phonetic}</span>
              {current.audio_url && (
                <button onClick={() => playAudio(current.audio_url)} className="text-slate-300 hover:text-blue-500 transition-colors">🔊</button>
              )}
            </div>
          )}

          {/* Input mode box */}
          {mode === 'input' && !flipped && (
            <div className="w-full mt-1 flex gap-2">
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitInput()}
                placeholder={direction === 'en-zh' ? '输入中文解释…' : '输入英文…'}
                autoFocus
                className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                  dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
              />
              <button onClick={submitInput} className="px-3 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                查看
              </button>
            </div>
          )}

          {/* Back (after flip) */}
          {flipped && (
            <div className="w-full space-y-2 mt-1">
              <div className="w-12 h-px bg-slate-200 dark:bg-slate-600 mx-auto" />

              {/* User input comparison */}
              {mode === 'input' && inputShown && (
                <div className="text-xs text-left bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                  <span className="text-slate-400">你的答案：</span>
                  <span className="text-slate-700 dark:text-slate-200">{inputVal || '（未填写）'}</span>
                </div>
              )}

              <p className="text-lg text-slate-800 dark:text-slate-100 font-medium">
                {direction === 'zh-en' ? <ClickableText text={back} onWordClick={lookup} /> : back}
              </p>

              {/* Phonetic on back when ZH side was front */}
              {direction === 'zh-en' && current.phonetic && (
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-sm text-slate-400">{current.phonetic}</span>
                  {current.audio_url && (
                    <button onClick={() => playAudio(current.audio_url)} className="text-slate-300 hover:text-blue-500 transition-colors">🔊</button>
                  )}
                </div>
              )}

              {current.usage_example && (
                <p className="text-sm text-slate-400 italic leading-relaxed">
                  "<ClickableText text={current.usage_example} onWordClick={lookup} />"
                </p>
              )}
            </div>
          )}

          <DictResultPanel queriedWord={queriedWord} dict={dict} loading={dictLoading} error={dictError} />
        </div>
      </div>

      {/* Action buttons */}
      {!flipped ? (
        <button onClick={flip}
          className="w-full py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300
            hover:border-blue-300 hover:text-blue-600 transition-colors">
          翻牌 <span className="text-slate-400 text-xs ml-1">[空格]</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => grade('forgot')} disabled={grading}
            className="py-3.5 rounded-xl text-sm font-bold bg-red-50 text-red-500 hover:bg-red-100
              border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 disabled:opacity-50 transition-colors">
            记不住 <span className="text-red-300 text-xs font-normal ml-1">[1]</span>
          </button>
          <button onClick={() => grade('know')} disabled={grading}
            className="py-3.5 rounded-xl text-sm font-bold bg-green-50 text-green-600 hover:bg-green-100
              border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 disabled:opacity-50 transition-colors">
            认识 ✓ <span className="text-green-300 text-xs font-normal ml-1">[2]</span>
          </button>
        </div>
      )}

      <p className="text-center text-xs text-slate-300 dark:text-slate-600 pt-1">
        空格 翻牌 · 1 记不住 · 2 认识
      </p>
    </div>
  );
}
