import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import KnowledgeConfirmModal from './KnowledgeConfirmModal';

const CAT_VALUES = ['grammar', 'word_sense', 'collocation', 'polysemy'];

// Tiny markdown subset (bold + line breaks) — enough for the tutor's
// teaching-style replies without pulling in a markdown library.
function renderMessageText(text) {
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : part
      )}
    </React.Fragment>
  ));
}

// Chat content only — no card chrome (background/border/header) of its own,
// since it's embedded inside FloatingAiChat's draggable window frame, which
// supplies the title bar, drag handle, and close button.
export default function AiTutorChat() {
  const { t } = useTranslation();
  const CATS = CAT_VALUES.map(value => ({ value, label: t(`categories.${value}`) }));
  const [messages, setMessages] = useState([]); // { role, content, imageUrl? }
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState(null); // { file, url }
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [extractCats, setExtractCats] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);

  const scrollRef = useRef();
  const fileRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text && !pendingImage) return;

    const historyForApi = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: text, imageUrl: pendingImage?.url }]);
    setInput('');
    const img = pendingImage;
    setPendingImage(null);
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      if (text) fd.append('message', text);
      if (img) fd.append('image', img.file);
      fd.append('history', JSON.stringify(historyForApi));
      const { reply } = await api.chatWithTutor(fd);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(t(`errors.${e.code}`, t('errors.generic')));
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    // e.nativeEvent.isComposing covers most browsers; keyCode 229 is the
    // fallback some browsers (older Safari in particular) still rely on for
    // the Enter that confirms a Chinese/Japanese/Korean IME candidate — without
    // this check that confirming keystroke gets misread as "send message".
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text/plain');
    if (text?.trim()) return; // let real text paste through normally
    const items = Array.from(e.clipboardData?.items || []);
    const imgFile = items
      .filter(it => it.kind === 'file' && it.type.startsWith('image/'))
      .map(it => it.getAsFile())
      .filter(Boolean)[0];
    if (imgFile) { e.preventDefault(); setPendingImage({ file: imgFile, url: URL.createObjectURL(imgFile) }); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) setPendingImage({ file, url: URL.createObjectURL(file) });
  };

  const toggleCat = (v) => setExtractCats(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const extractFromChat = async () => {
    if (!extractCats.length) { setError(t('aiChat.tutorChat.errNoCategorySelected')); return; }
    setExtracting(true);
    setError(null);
    try {
      const transcript = messages
        .filter(m => m.content)
        .map(m => `${m.role === 'user' ? '学生' : '老师'}：${m.content}`)
        .join('\n\n');
      const fd = new FormData();
      fd.append('text', transcript);
      extractCats.forEach(c => fd.append('category', c));
      const points = await api.extractKnowledge(fd);
      if (!points.length) { setError(t('aiChat.tutorChat.errNoExtraction')); return; }
      setExtracted(points);
    } catch (e) {
      setError(t(`errors.${e.code}`, t('errors.generic')));
    } finally {
      setExtracting(false);
    }
  };

  const hasReply = messages.some(m => m.role === 'assistant');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-slate-300 dark:text-slate-600 text-sm px-6">
            {t('aiChat.tutorChat.emptyPrompt')}
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  {m.imageUrl && <img src={m.imageUrl} alt="" className="rounded-md mb-1.5 max-h-32 object-cover" />}
                  {m.content && renderMessageText(m.content)}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400">
                  {t('aiChat.tutorChat.thinking')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-3 space-y-2 border-t border-slate-100 dark:border-slate-700 shrink-0">
        {pendingImage && (
          <div className="relative inline-block">
            <img src={pendingImage.url} alt="" className="h-14 rounded-md border border-slate-200 dark:border-slate-600" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-1.5 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            placeholder={t('aiChat.tutorChat.inputPlaceholder')}
            rows={1}
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm resize-none
              dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title={t('aiChat.tutorChat.uploadScreenshotTitle')}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600
              text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-colors"
          >
            🖼
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
          <button
            onClick={send}
            disabled={sending || (!input.trim() && !pendingImage)}
            className="shrink-0 px-3 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('aiChat.tutorChat.send')}
          </button>
        </div>
      </div>

      {hasReply && (
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/20 space-y-2 shrink-0">
          <label className="text-xs text-slate-400 block">{t('aiChat.tutorChat.extractLabel')}</label>
          <div className="flex flex-wrap gap-1.5">
            {CATS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleCat(c.value)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                  extractCats.includes(c.value)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {extractCats.includes(c.value) && <span className="mr-0.5">✓</span>}
                {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={extractFromChat}
            disabled={extracting || !extractCats.length}
            className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900
              text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {extracting ? t('aiChat.tutorChat.extracting') : t('aiChat.tutorChat.extractButton')}
          </button>
        </div>
      )}

      {error && (
        <div className="mx-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400 shrink-0">
          {error}
        </div>
      )}

      {extracted && (
        <KnowledgeConfirmModal
          points={extracted}
          onBack={() => setExtracted(null)}
          onConfirmed={() => { setExtracted(null); setExtractCats([]); }}
        />
      )}
    </div>
  );
}
