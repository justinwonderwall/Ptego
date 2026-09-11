import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Scans the rendered article for headings and turns them into a sticky
// left-hand outline nav — mirrors the note's actual structure (from the
// live DOM, not a re-parse of the markdown) so it always matches what's
// on screen, including inline formatting inside headings.
export default function ArticleToc({ containerRef, watch }) {
  const { t } = useTranslation();
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) { setHeadings([]); return; }

    const scan = () => {
      const els = Array.from(container.querySelectorAll('h1, h2, h3'));
      const items = els.map((el, i) => {
        if (!el.id) el.id = `toc-${i}-${el.textContent.trim().slice(0, 20).replace(/\s+/g, '-')}`;
        return { id: el.id, text: el.textContent.trim(), level: Number(el.tagName[1]) };
      }).filter(h => h.text);
      // MDXEditor's read-only ProseMirror view touches the DOM continually
      // (selection/decoration bookkeeping) even when the content itself
      // never changes — skipping same-content updates keeps this from
      // churning the IntersectionObserver below on every render tick.
      setHeadings(prev =>
        prev.length === items.length && prev.every((h, i) => h.id === items[i].id && h.text === items[i].text)
          ? prev
          : items
      );
    };

    scan();
    // MDXEditor hydrates its ProseMirror content asynchronously (image/link
    // plugins, initial doc parse) — a one-shot scan on mount can run before
    // any headings exist. Watch the subtree instead of guessing a delay.
    const observer = new MutationObserver(scan);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [containerRef, watch]);

  useEffect(() => {
    if (!headings.length) return;
    const scrollParent = containerRef.current?.closest('.overflow-y-auto') || null;
    // Each callback only reports entries whose intersection state just
    // changed, not the full current set — naively trusting entries[0] per
    // callback made a later, barely-visible heading overwrite a still-fully
    // -visible earlier one. Track the live set across callbacks instead and
    // pick the first (topmost, in document order) heading that's in it.
    const intersecting = new Set();
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) intersecting.add(e.target.id);
          else intersecting.delete(e.target.id);
        });
        const topMost = headings.find(h => intersecting.has(h.id));
        if (topMost) setActiveId(topMost.id);
      },
      { root: scrollParent, rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );
    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings, containerRef]);

  if (headings.length < 2) return null;

  const minLevel = Math.min(...headings.map(h => h.level));

  return (
    <nav className="w-48 shrink-0 max-h-[50vh] overflow-y-auto pr-2">
      <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
        {t('articleToc.navTitle')}
      </div>
      <ul className="space-y-0.5 border-l border-slate-200 dark:border-slate-700">
        {headings.map(h => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={e => {
                e.preventDefault();
                const el = document.getElementById(h.id);
                if (!el) return;
                // The page's real scroll container is the routed-content div
                // in main.jsx (`overflow-y-auto`), not the window — plain
                // scrollIntoView() measures against the wrong box here, so
                // the target scrollTop is computed by hand instead.
                const scrollParent = el.closest('.overflow-y-auto') || document.scrollingElement;
                const offset = el.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top + scrollParent.scrollTop - 24;
                scrollParent.scrollTo({ top: offset, behavior: 'smooth' });
              }}
              style={{ paddingLeft: `${(h.level - minLevel) * 12 + 12}px` }}
              className={`block py-1 -ml-px border-l-2 text-sm truncate transition-colors ${
                activeId === h.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
