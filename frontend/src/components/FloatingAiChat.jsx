import React, { useState, useRef, useEffect, useCallback } from 'react';
import AiTutorChat from './AiTutorChat';

const BUTTON_SIZE = 56;
const WINDOW_W = 380;
const WINDOW_H = 540;

// Minimal drag-anywhere hook — no dependency, just pointer events. Reports
// whether the pointer actually moved (past a small threshold) so callers can
// tell a drag apart from a plain click on mouseup.
function useDraggable(initialPos, size) {
  const [pos, setPos] = useState(initialPos);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const onPointerDown = useCallback((e) => {
    const point = e.touches ? e.touches[0] : e;
    dragging.current = true;
    moved.current = false;
    start.current = { x: point.clientX, y: point.clientY, posX: pos.x, posY: pos.y };
  }, [pos.x, pos.y]);

  useEffect(() => {
    const clamp = (x, y) => ({
      x: Math.min(Math.max(0, x), window.innerWidth - size.w),
      y: Math.min(Math.max(0, y), window.innerHeight - size.h),
    });
    const onMove = (e) => {
      if (!dragging.current) return;
      const point = e.touches ? e.touches[0] : e;
      const dx = point.clientX - start.current.x;
      const dy = point.clientY - start.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setPos(clamp(start.current.posX + dx, start.current.posY + dy));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [size.w, size.h]);

  return { pos, setPos, onPointerDown, moved };
}

// Mounted once at the app root (main.jsx) — not inside any single page — so
// the chat button/window and the conversation itself persist across
// navigation between 首页/复习/笔记. The window is kept mounted at all times
// (visibility toggled via CSS, not conditional rendering) so AiTutorChat's
// message state survives closing/reopening.
export default function FloatingAiChat() {
  const [open, setOpen] = useState(false);

  const btn = useDraggable(
    { x: window.innerWidth - BUTTON_SIZE - 24, y: window.innerHeight - BUTTON_SIZE - 24 },
    { w: BUTTON_SIZE, h: BUTTON_SIZE }
  );
  const win = useDraggable(
    { x: window.innerWidth - WINDOW_W - 24, y: window.innerHeight - WINDOW_H - 96 },
    { w: WINDOW_W, h: WINDOW_H }
  );

  const handleButtonClick = () => {
    if (btn.moved.current) return; // was a drag, not a click
    setOpen(v => !v);
  };

  return (
    <>
      <button
        onMouseDown={btn.onPointerDown}
        onTouchStart={btn.onPointerDown}
        onClick={handleButtonClick}
        title="AI 答疑 · PTE 老师"
        aria-label="打开 AI 答疑"
        style={{ left: btn.pos.x, top: btn.pos.y, width: BUTTON_SIZE, height: BUTTON_SIZE }}
        className="fixed z-40 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white
          shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_28px_-8px_rgb(59_130_246/0.6)]
          hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_14px_32px_-8px_rgb(59_130_246/0.7)] hover:scale-105
          flex items-center justify-center text-2xl cursor-grab active:cursor-grabbing select-none transition-all duration-150"
      >
        🎓
      </button>

      <div
        style={{ left: win.pos.x, top: win.pos.y, width: WINDOW_W, height: WINDOW_H }}
        className={`fixed z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80
          shadow-[0_2px_4px_rgb(15_23_42/0.06),0_28px_60px_-20px_rgb(15_23_42/0.35)]
          dark:shadow-[0_2px_4px_rgb(0_0_0/0.4),0_28px_60px_-16px_rgb(0_0_0/0.75)]
          flex flex-col overflow-hidden ${open ? '' : 'hidden'}`}
      >
        <div
          onMouseDown={win.onPointerDown}
          onTouchStart={win.onPointerDown}
          className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 shrink-0 flex items-center justify-between
            bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-900/10 dark:to-transparent
            cursor-grab active:cursor-grabbing select-none"
        >
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">🎓 AI 答疑 · PTE 老师</h2>
          <button
            onClick={() => setOpen(false)}
            onMouseDown={e => e.stopPropagation()}
            aria-label="关闭"
            className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <AiTutorChat />
        </div>
      </div>
    </>
  );
}
