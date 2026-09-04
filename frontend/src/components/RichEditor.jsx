import React, { useRef, useEffect } from 'react';
import { api } from '../api';

// document.execCommand is deprecated but still broadly supported in
// Chromium and is by far the smallest way to get bold/underline/list/image
// commands working against a contentEditable region without pulling in a
// full editor library.
const exec = (cmd, value = null) => document.execCommand(cmd, false, value);

export default function RichEditor({ initialContent, onChange, editorKey }) {
  const ref = useRef(null);
  const fileRef = useRef(null);

  // Only stamp innerHTML when switching to a different template (editorKey
  // changes) — never on every keystroke, or the cursor would jump to the end.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialContent || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey]);

  const handleInput = () => onChange(ref.current.innerHTML);

  const insertImage = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { url } = await api.uploadTemplateImage(fd);
      ref.current.focus();
      exec('insertHTML', `<img src="${url}" style="max-width:100%;border-radius:8px;margin:8px 0;display:block;" />`);
      handleInput();
    } catch (e) {
      alert('图片上传失败：' + e.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) insertImage(file);
    e.target.value = '';
  };

  // onMouseDown + preventDefault (instead of onClick) keeps focus — and the
  // current text selection — inside the editable region, which execCommand
  // needs in order to know where to apply the formatting.
  const ToolButton = ({ cmd, title, children }) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); exec(cmd); handleInput(); }}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300
        hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex-wrap">
        <ToolButton cmd="bold" title="加粗"><span className="font-bold">B</span></ToolButton>
        <ToolButton cmd="underline" title="下划线"><span className="underline">U</span></ToolButton>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />
        <ToolButton cmd="insertOrderedList" title="编号列表 1. 2. 3.">1.</ToolButton>
        <ToolButton cmd="insertUnorderedList" title="项目符号">•</ToolButton>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="插入图片"
          className="h-8 px-2.5 flex items-center gap-1 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          🖼 图片
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="rich-content min-h-[320px] max-h-[60vh] overflow-y-auto px-4 py-3 text-sm leading-relaxed
          text-slate-800 dark:text-slate-100 focus:outline-none"
      />
    </div>
  );
}
