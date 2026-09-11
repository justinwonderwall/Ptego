import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

const VOCAB_VALUES = ['pronunciation', 'spelling', 'reading'];

function playAudio(url) { if (url) new Audio(url).play().catch(() => {}); }

function PhoneticRow({ label, phonetic, audioUrl }) {
  if (!phonetic) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <span className="text-sm text-slate-600 dark:text-slate-300">/{phonetic}/</span>
      {audioUrl && (
        <button onClick={() => playAudio(audioUrl)} className="text-blue-400 hover:text-blue-500 transition-colors">🔊</button>
      )}
    </div>
  );
}

// Portaled to <body> for the same reason as the other fixed-position modals in
// this app (CheckInModal etc.) — a backdrop-filter ancestor would otherwise
// become the containing block and clip this to that ancestor's box.
export default function WordPopup({ word, onClose }) {
  const { t } = useTranslation();
  const VOCAB_TYPES = VOCAB_VALUES.map(value => ({ value, label: t(`vocabTypes.${value}`) }));
  const [dict, setDict]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [note, setNote]       = useState('');
  const closeTimer = useRef(null);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDict(null);
    setSaved(false);
    api.lookupWord(word)
      .then(data => { if (!cancelled) setDict(data); })
      .catch(e => { if (!cancelled) setError(e.message || t('wordPopup.notFound')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [word]);

  const saveToVocab = async (vocabType) => {
    setSaving(true);
    try {
      await api.saveKnowledge([{
        category: 'word_sense',
        term_en: word,
        meaning_zh: (dict?.zh_definitions || []).map(d => d.meaning_zh).join('；'),
        usage_example: dict?.example_en || null,
        study_note: note.trim() || null,
        vocab_type: vocabType,
        phonetic: dict?.phonetic || null,
        audio_url: dict?.audio_url || null,
        source_type: 'dictionary',
      }]);
      setSaved(true);
      // Auto-close shortly after saving — the confirmation is enough
      // feedback, so looking up the next word shouldn't need an extra
      // manual close click.
      closeTimer.current = setTimeout(onClose, 900);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    // No full-screen backdrop on purpose — this popup is also triggered from
    // inside the floating AI chat window (DictionaryQuickAdd, or a word
    // clicked in a tutor reply), and a blocking backdrop made it impossible
    // to keep typing in the chat while the definition was open. Closing now
    // requires the explicit × or "back" button instead of a background click.
    <div
      className="fixed top-[8vh] left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto
        bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6"
    >
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-3xl font-bold text-blue-500">{word}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 text-xl leading-none">✕</button>
        </div>

        {loading && <p className="text-sm text-slate-400 py-8 text-center">{t('wordPopup.querying')}</p>}
        {error && <p className="text-sm text-red-500 py-8 text-center">{error}</p>}

        {dict && (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
              <PhoneticRow label="UK" phonetic={dict.phonetic_uk} audioUrl={dict.audio_url_uk} />
              <PhoneticRow label="US" phonetic={dict.phonetic_us} audioUrl={dict.audio_url_us} />
              {!dict.phonetic_uk && !dict.phonetic_us && (
                <PhoneticRow label="" phonetic={dict.phonetic} audioUrl={dict.audio_url} />
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('wordPopup.dictDefinitionsLabel')}</p>
                {dict.zh_definitions?.length ? (
                  <ul className="space-y-2">
                    {dict.zh_definitions.map((d, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-200">
                        {d.partOfSpeech && <span className="text-slate-400 font-medium mr-1.5">[{d.partOfSpeech}]</span>}
                        {d.meaning_zh}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-300 dark:text-slate-600">{t('wordPopup.noEntry')}</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('wordPopup.referenceExampleLabel')}</p>
                {dict.example_en ? (
                  <div className="text-sm space-y-1">
                    <p className="text-slate-700 dark:text-slate-200">{dict.example_en}</p>
                    {dict.example_zh && <p className="text-slate-400">{dict.example_zh}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 dark:text-slate-600">{t('wordPopup.noExample')}</p>
                )}
              </div>
            </div>
          </>
        )}

        {dict && !saved && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">{t('wordPopup.noteLabel')}</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('wordPopup.notePlaceholder')}
              rows={2}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm resize-none
                dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
            />
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('common.back')}
          </button>

          {saved ? (
            <span className="text-sm text-green-500 font-medium">{t('wordPopup.savedToVocab')}</span>
          ) : dict ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-0.5">{t('wordPopup.addToVocabLabel')}</span>
              {VOCAB_TYPES.map(vt => (
                <button
                  key={vt.value}
                  disabled={saving}
                  onClick={() => saveToVocab(vt.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-600
                    hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
                >
                  {vt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
    </div>,
    document.body
  );
}
