import React from 'react';
import { useTranslation } from 'react-i18next';

// Strip surrounding punctuation/quotes so "rise." or "(rise)" still looks up "rise"
const cleanWord = (token) => token.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');

export function ClickableText({ text, onWordClick, className }) {
  const { t } = useTranslation();
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
            title={t('dictionaryLookup.lookupTitle', { word })}
          >
            {token}
          </button>
        );
      })}
    </>
  );
}
