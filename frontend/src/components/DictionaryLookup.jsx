import React, { useState } from 'react';
import { api } from '../api';

// Strip surrounding punctuation/quotes so "rise." or "(rise)" still looks up "rise"
const cleanWord = (token) => token.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');

export function ClickableText({ text, onWordClick, className }) {
  const tokens = (text || '').split(/(\s+)/);
  return (
    <>
      {tokens.map((token, i) => {
        if (/^\s*$/.test(token)) return <React.Fragment key={i}>{token}</React.Fragment>;
        const word = cleanWord(token);
        if (!word) return <React.Fragment key={i}>{token}</React.Fragment>;
        return (
          <button
            key={i}
            onClick={e => { e.stopPropagation(); onWordClick(word); }}
            className={`bg-transparent border-0 p-0 m-0 font-inherit align-baseline hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer ${className || ''}`}
            title={`点击查 "${word}"`}
          >
            {token}
          </button>
        );
      })}
    </>
  );
}

export function useDictLookup() {
  const [queriedWord, setQueriedWord] = useState(null);
  const [dict, setDict]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const lookup = async (word) => {
    if (!word || loading) return;
    setQueriedWord(word);
    setDict(null);
    setLoading(true);
    setError(null);
    try {
      const data = await api.lookupWord(word);
      setDict(data);
    } catch (e) {
      setError(e.message || '未查到该词');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setQueriedWord(null); setDict(null); setError(null); };

  return { queriedWord, dict, loading, error, lookup, reset };
}

export function DictResultPanel({ queriedWord, dict, loading, error }) {
  if (!queriedWord) return null;
  const playAudio = (url) => { if (url) new Audio(url).play().catch(() => {}); };

  const hasZh = dict?.zh_definitions?.length > 0;
  const hasEn = dict?.definitions?.length > 0;
  const noData = dict && !hasZh && !hasEn;

  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2.5 space-y-2 text-left w-full">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">词典释义 · {queriedWord}</p>
      {loading && <p className="text-sm text-slate-400">查询中…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {dict && (
        <>
          <div className="flex items-center gap-1.5">
            {dict.phonetic && <span className="text-xs text-slate-400">{dict.phonetic}</span>}
            {dict.audio_url && (
              <button onClick={() => playAudio(dict.audio_url)} className="text-slate-300 hover:text-blue-500 transition-colors text-sm">🔊</button>
            )}
          </div>

          {hasZh && (
            <ul className="space-y-1.5">
              {dict.zh_definitions.map((d, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-200">
                  {d.partOfSpeech && <span className="text-slate-400 italic mr-1">({d.partOfSpeech})</span>}
                  {d.meaning_zh}
                </li>
              ))}
            </ul>
          )}

          {hasEn && (
            <ul className="space-y-1 opacity-70">
              {dict.definitions.map((d, i) => (
                <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                  {d.partOfSpeech && <span className="italic mr-1">({d.partOfSpeech})</span>}
                  {d.definition}
                </li>
              ))}
            </ul>
          )}

          {dict.example_en && (
            <div className="text-xs italic border-l-2 border-slate-100 dark:border-slate-700 pl-2 space-y-0.5">
              <p className="text-slate-500 dark:text-slate-400">{dict.example_en}</p>
              {dict.example_zh && <p className="not-italic text-slate-400 dark:text-slate-500">{dict.example_zh}</p>}
            </div>
          )}

          {noData && <p className="text-sm text-slate-400">词典未收录该词条</p>}
        </>
      )}
    </div>
  );
}
