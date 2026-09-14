import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClickableText } from './DictionaryLookup';
import WordPopup from './WordPopup';

const CAT_COLORS = {
  grammar:      'bg-blue-50  text-blue-600  dark:bg-blue-900/30  dark:text-blue-300',
  word_sense:   'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  collocation:  'bg-teal-50  text-teal-600  dark:bg-teal-900/30  dark:text-teal-300',
  polysemy:     'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function KnowledgeDetailModal({ item, onClose, onEdit }) {
  const { t } = useTranslation();
  const [popupWord, setPopupWord] = useState(null);

  const playAudio = (url) => { if (url) new Audio(url).play().catch(() => {}); };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Category + skill tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[item.category] || ''}`}>
            {item.category ? t(`categories.${item.category}`, item.category) : item.category}
          </span>
          {item.skill_tags?.map(tag => (
            <span key={tag} className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              {tag}
            </span>
          ))}
        </div>

        {/* Term (each word clickable -> dictionary lookup) */}
        <div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <ClickableText text={item.term_en} onWordClick={setPopupWord} />
          </div>
          {(item.phonetic || item.audio_url) && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
              {item.phonetic && <span>{item.phonetic}</span>}
              {item.audio_url && (
                <button onClick={() => playAudio(item.audio_url)} className="text-slate-300 hover:text-blue-500 transition-colors">🔊</button>
              )}
            </div>
          )}
        </div>

        {/* Meaning */}
        <p className="text-slate-700 dark:text-slate-200">{item.meaning_zh}</p>

        {/* Example (each word clickable too) */}
        {item.usage_example && (
          <p className="text-sm text-slate-400 italic leading-relaxed border-l-2 border-slate-100 dark:border-slate-700 pl-3">
            "<ClickableText text={item.usage_example} onWordClick={setPopupWord} />"
          </p>
        )}

        {/* Study note */}
        {item.study_note && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-300 uppercase tracking-wider mb-1">{t('knowledge.fields.studyNote')}</p>
            <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">{item.study_note}</p>
          </div>
        )}

        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm font-medium
                text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              {t('common.edit')}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 text-sm
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>

      {popupWord && <WordPopup word={popupWord} onClose={() => setPopupWord(null)} />}
    </div>
  );
}
