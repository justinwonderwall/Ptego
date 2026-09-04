import React, { useState, useRef, useCallback } from 'react';
import { api } from '../api';
import KnowledgeConfirmModal from './KnowledgeConfirmModal';

const CATEGORIES = [
  { value: '',             label: 'AI 自动判断' },
  { value: 'grammar',     label: '语法 Grammar' },
  { value: 'word_sense',  label: '词义辨析 Word Sense' },
  { value: 'collocation', label: '固定搭配 Collocation' },
  { value: 'polysemy',    label: '多义词 Polysemy' },
  { value: 'pronunciation', label: '发音 Pronunciation' },
];

const ACCEPT_IMAGE = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const ACCEPT_DOC   = ['application/pdf', 'text/plain'];

export default function AddKnowledgeDrawer({ onClose }) {
  const [text, setText]         = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages]     = useState([]);     // [{ file, url }]
  const [docFile, setDocFile]   = useState(null);   // { file, name } — PDF or txt
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [extractedPoints, setExtractedPoints] = useState(null);
  const [savedMsg, setSavedMsg] = useState(null);
  const [dragging, setDragging] = useState(false);

  const imgInputRef = useRef();
  const docInputRef = useRef();

  // ---------- helpers ----------
  const addImageFile = useCallback((file) => {
    if (!ACCEPT_IMAGE.includes(file.type)) return;
    setImages(prev => [...prev, { file, url: URL.createObjectURL(file) }]);
  }, []);

  const setDoc = useCallback((file) => {
    if (!ACCEPT_DOC.includes(file.type)) return;
    setDocFile({ file, name: file.name });
  }, []);

  const removeImage = (idx) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeDoc = () => setDocFile(null);

  // ---------- event handlers ----------
  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      addImageFile(imgItem.getAsFile());
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(f => {
      if (ACCEPT_IMAGE.includes(f.type)) addImageFile(f);
      else if (ACCEPT_DOC.includes(f.type)) setDoc(f);
    });
  };

  const handleFileInput = (e) => {
    Array.from(e.target.files).forEach(f => {
      if (ACCEPT_IMAGE.includes(f.type)) addImageFile(f);
      else if (ACCEPT_DOC.includes(f.type)) setDoc(f);
    });
    e.target.value = '';
  };

  // ---------- extract ----------
  const extract = async () => {
    if (!text.trim() && images.length === 0 && !docFile) {
      setError('请输入文本、粘贴图片或上传文件');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append('text', text.trim());
      if (category)    fd.append('category', category);
      images.forEach(img => fd.append('image', img.file));
      if (docFile)     fd.append('file', docFile.file);

      const points = await api.extractKnowledge(fd);
      if (!points.length) {
        setError('AI 未提取到知识点，请调整内容后重试');
        return;
      }
      setExtractedPoints(points);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- after confirm ----------
  const handleConfirmed = (count) => {
    setText('');
    setCategory('');
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
    setDocFile(null);
    setExtractedPoints(null);
    setSavedMsg(`已保存 ${count} 个知识点 ✓`);
    setTimeout(() => setSavedMsg(null), 3000);
  };

  const hasContent = text.trim() || images.length > 0 || docFile;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">录入知识点</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">分类</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Textarea */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
              文本内容
              <span className="font-normal text-slate-400 ml-1">（支持 Ctrl+V 直接粘贴截图）</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onPaste={handlePaste}
              placeholder="粘贴或输入要整理的句子、单词、段落…"
              rows={7}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm
                dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl transition-colors ${
              dragging
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-600'
            }`}
          >
            <div className="flex divide-x divide-slate-200 dark:divide-slate-600">
              {/* Image upload */}
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                className="flex-1 py-4 flex flex-col items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-l-xl transition-colors"
              >
                <span className="text-xl">🖼</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">上传图片</span>
                <span className="text-[10px] text-slate-400">PNG · JPG</span>
              </button>
              {/* Doc upload */}
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex-1 py-4 flex flex-col items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-r-xl transition-colors"
              >
                <span className="text-xl">📄</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">上传文件</span>
                <span className="text-[10px] text-slate-400">PDF · TXT</span>
              </button>
            </div>
            {dragging && (
              <p className="text-center text-sm text-blue-500 pb-3">松开鼠标上传</p>
            )}
          </div>

          {/* Hidden inputs */}
          <input
            ref={imgInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="hidden"
            onChange={handleFileInput}
          />

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-50">
                  <img src={img.url} alt="" className="w-full h-28 object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs
                      flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Doc file chip */}
          {docFile && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
              <span className="text-base">
                {docFile.name.endsWith('.pdf') ? '📕' : '📝'}
              </span>
              <span className="text-sm text-blue-700 dark:text-blue-300 flex-1 truncate">{docFile.name}</span>
              <button
                onClick={removeDoc}
                className="text-blue-400 hover:text-red-400 text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Success */}
          {savedMsg && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2 text-sm text-green-600 dark:text-green-400 font-medium">
              {savedMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button
            onClick={extract}
            disabled={loading || !hasContent}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                AI 整理中…
              </>
            ) : (
              '✨  AI 整理'
            )}
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {extractedPoints && (
        <KnowledgeConfirmModal
          points={extractedPoints}
          onBack={() => setExtractedPoints(null)}
          onConfirmed={handleConfirmed}
        />
      )}
    </>
  );
}
