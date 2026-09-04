import React, { useState, useRef, useCallback } from 'react';
import { api } from '../api';
import KnowledgeConfirmModal from './KnowledgeConfirmModal';
import DictionaryQuickAdd from './DictionaryQuickAdd';

const CATS = [
  { value: 'grammar',      label: '语法',    color: 'border-blue-300   text-blue-600   bg-blue-50   dark:bg-blue-900/30   dark:text-blue-300   dark:border-blue-700' },
  { value: 'word_sense',   label: '词义辨析', color: 'border-purple-300 text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700' },
  { value: 'collocation',  label: '固定搭配', color: 'border-teal-300   text-teal-600   bg-teal-50   dark:bg-teal-900/30   dark:text-teal-300   dark:border-teal-700' },
  { value: 'polysemy',     label: '多义词',   color: 'border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' },
  { value: 'pronunciation',label: '发音',    color: 'border-pink-300   text-pink-600   bg-pink-50   dark:bg-pink-900/30   dark:text-pink-300   dark:border-pink-700' },
];

const ACCEPT_IMAGE = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

// Browsers/OSes don't reliably report mimetypes for docx/md (especially on drop),
// so accept by extension too, not just mimetype.
const ACCEPT_DOC_MIME = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // legacy .doc — accepted here, backend gives a clear "convert to .docx" error
];
const ACCEPT_DOC_EXT = ['.pdf', '.txt', '.md', '.docx', '.doc'];

const isAcceptedDoc = (file) => {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  return ACCEPT_DOC_MIME.includes(file.type) || ACCEPT_DOC_EXT.includes(ext);
};

export default function AddKnowledgePanel() {
  const [text, setText]       = useState('');
  const [images, setImages]   = useState([]);    // [{ file, url }]
  const [docFile, setDocFile] = useState(null);  // { file, name }
  const [category, setCat]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [savedMsg, setSavedMsg] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [dragging, setDragging] = useState(false);

  const imgRef = useRef();
  const docRef = useRef();

  // ---------- file helpers ----------
  const addImages = useCallback((files) => {
    const imgs = Array.from(files).filter(f => f && ACCEPT_IMAGE.includes(f.type));
    setImages(prev => [...prev, ...imgs.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  }, []);

  const setDoc = useCallback((file) => {
    if (isAcceptedDoc(file)) setDocFile({ file, name: file.name });
  }, []);

  const removeImage = (idx) => {
    setImages(prev => { URL.revokeObjectURL(prev[idx].url); return prev.filter((_, i) => i !== idx); });
  };

  // ---------- events ----------
  const handlePaste = (e) => {
    // If the clipboard carries real text, let the browser paste it normally —
    // some copy sources (Word, PDF viewers, macOS Live Text) attach an image
    // representation alongside plain text, which used to get treated as an
    // image paste and silently swallowed the text.
    const text = e.clipboardData?.getData('text/plain');
    if (text?.trim()) return;

    const items = Array.from(e.clipboardData?.items || []);
    const imgFiles = items
      .filter(it => it.kind === 'file' && it.type.startsWith('image/'))
      .map(it => it.getAsFile())
      .filter(Boolean);

    if (imgFiles.length) { e.preventDefault(); addImages(imgFiles); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    Array.from(e.dataTransfer.files).forEach(f => {
      if (ACCEPT_IMAGE.includes(f.type)) addImages([f]);
      else if (isAcceptedDoc(f)) setDoc(f);
    });
  };

  const handleFileChange = (e) => {
    Array.from(e.target.files).forEach(f => {
      if (ACCEPT_IMAGE.includes(f.type)) addImages([f]);
      else if (isAcceptedDoc(f)) setDoc(f);
    });
    e.target.value = '';
  };

  // ---------- extract ----------
  const canExtract = (text.trim() || images.length || docFile) && category;

  const extract = async () => {
    if (!canExtract) {
      setError(!category ? '请先选择分类' : '请输入内容或上传文件');
      return;
    }
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append('text', text.trim());
      fd.append('category', category);
      images.forEach(img => fd.append('image', img.file));
      if (docFile) fd.append('file', docFile.file);
      const points = await api.extractKnowledge(fd);
      if (!points.length) { setError('AI 未提取到知识点，请调整内容重试'); return; }
      setExtracted(points);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmed = (count) => {
    setText(''); setCat('');
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]); setDocFile(null); setExtracted(null);
    setSavedMsg(`已保存 ${count} 个知识点 ✓`);
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-sm flex flex-col h-full">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">录入知识点</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* 0. 字典查询 */}
          <DictionaryQuickAdd />

          {/* 1. 文本输入 */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">内容 <span className="font-normal">（Ctrl+V 可粘贴截图）</span></label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onPaste={handlePaste}
              placeholder="输入或粘贴要整理的单词、句子、段落…"
              rows={5}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                dark:bg-slate-700 dark:text-white focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* 2. 上传 */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">上传文件</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
                dragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'
              }`}
            >
              <div className="flex divide-x divide-slate-200 dark:divide-slate-600">
                <button type="button" onClick={() => imgRef.current?.click()}
                  className="flex-1 py-3 flex flex-col items-center gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <span className="text-lg">🖼</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">图片</span>
                  <span className="text-[10px] text-slate-400">PNG · JPG</span>
                </button>
                <button type="button" onClick={() => docRef.current?.click()}
                  className="flex-1 py-3 flex flex-col items-center gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <span className="text-lg">📄</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">文件</span>
                  <span className="text-[10px] text-slate-400">PDF · Word · TXT · MD</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-300 dark:text-slate-600 text-center pb-2">或将文件拖拽到此处</p>
            </div>
            <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple className="hidden" onChange={handleFileChange} />
            <input
              ref={docRef}
              type="file"
              accept=".pdf,.txt,.md,.docx,.doc,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {images.map((img, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-50">
                  <img src={img.url} alt="" className="w-full h-20 object-cover" />
                  <button onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Doc chip */}
          {docFile && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-1.5">
              <span className="text-sm">
                {docFile.name.endsWith('.pdf') ? '📕' : /\.docx?$/i.test(docFile.name) ? '📘' : '📝'}
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-300 flex-1 truncate">{docFile.name}</span>
              <button onClick={() => setDocFile(null)} className="text-blue-400 hover:text-red-400 leading-none">×</button>
            </div>
          )}

          {/* 3. 分类勾选 */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">分类 <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCat(v => v === c.value ? '' : c.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                    category === c.value
                      ? c.color
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {category === c.value && <span className="mr-0.5">✓</span>}
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {savedMsg && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2 text-xs text-green-600 dark:text-green-400 font-medium">
              {savedMsg}
            </div>
          )}
        </div>

        {/* Footer button */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button
            onClick={extract}
            disabled={loading || !canExtract}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                AI 整理中…
              </>
            ) : '✨  AI 整理'}
          </button>
        </div>
      </div>

      {extracted && (
        <KnowledgeConfirmModal
          points={extracted}
          onBack={() => setExtracted(null)}
          onConfirmed={handleConfirmed}
        />
      )}
    </>
  );
}
