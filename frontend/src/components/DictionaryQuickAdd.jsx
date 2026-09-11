import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WordPopup from './WordPopup';

// `active` reflects whether the floating chat window is actually open —
// FloatingAiChat keeps this component mounted at all times (hidden via CSS,
// not unmounted) so its own state persists, which means a plain "focus
// whenever popupWord clears" effect would also fire once at app boot while
// the window is still hidden and silently steal focus. Only autofocus while
// the window is genuinely visible: right when it opens, and right after a
// lookup popup closes.
export default function DictionaryQuickAdd({ active }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [popupWord, setPopupWord] = useState(null);
  const inputRef = useRef(null);
  const prevActive = useRef(active);
  const prevPopupWord = useRef(popupWord);

  useEffect(() => {
    const justOpened = active && !prevActive.current;
    const justClosedPopup = !popupWord && prevPopupWord.current;
    if (active && (justOpened || justClosedPopup)) {
      setQuery('');
      inputRef.current?.focus();
    }
    prevActive.current = active;
    prevPopupWord.current = popupWord;
  }, [active, popupWord]);

  const search = () => {
    const word = query.trim();
    if (!word) return;
    setPopupWord(word);
  };

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Enter') search();
        }}
        placeholder={t('dictionaryQuickAdd.placeholder')}
        className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm
          dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
      />
      <button
        onClick={search}
        disabled={!query.trim()}
        className="px-3 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40 transition-colors"
      >
        {t('dictionaryQuickAdd.search')}
      </button>

      {popupWord && <WordPopup word={popupWord} onClose={() => setPopupWord(null)} />}
    </div>
  );
}
