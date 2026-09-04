import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './index.css';
import Home from './pages/Home';
import Review from './pages/Review';
import Templates from './pages/Templates';
import { ThemeProvider, useTheme } from './useTheme';
import { useDueReminder } from './useDueReminder';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      aria-label="切换主题"
      className="relative w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700
        hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
    >
      {isDark ? (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m15.36 6.36l-1.06-1.06M6.7 6.7 5.64 5.64m12.72 0-1.06 1.06M6.7 17.3l-1.06 1.06M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0Z" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 008.998-5.998Z" />
        </svg>
      )}
    </button>
  );
}

function NotifyToggle({ enabled, permission, supported, onToggle }) {
  if (!supported) return null;
  const blocked = permission === 'denied';

  const title = blocked
    ? '通知权限已被浏览器拒绝，请在浏览器网站设置中开启'
    : enabled
    ? '复习提醒已开启，点击关闭'
    : '开启复习到期的桌面提醒';

  return (
    <button
      onClick={onToggle}
      disabled={blocked}
      title={title}
      aria-label="复习提醒"
      aria-pressed={enabled}
      className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
        blocked
          ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
          : enabled
          ? 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {enabled ? (
        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 22a2.25 2.25 0 002.236-2h-4.472A2.25 2.25 0 0012 22ZM18 15.34V11a6 6 0 10-12 0v4.34a1 1 0 01-.272.686L4.4 17.44A1 1 0 005.13 19h13.74a1 1 0 00.73-1.56l-1.328-1.414a1 1 0 01-.272-.686Z" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006.53 6.53M4.5 4.5l15 15M15 17.082A2.25 2.25 0 0112.75 19h-1.5a2.25 2.25 0 01-2.24-2.006M4.5 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.454 1.31" />
        </svg>
      )}
    </button>
  );
}

function NavItem({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
          isActive
            ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function Nav() {
  const { dueCount, supported, enabled, permission, toggle } = useDueReminder();

  return (
    <nav className="shrink-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-900/80
      border-b border-slate-200/80 dark:border-slate-800 px-6 py-3 flex items-center gap-2">
      <div className="flex items-center gap-2.5 mr-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
          <span className="text-white text-xs font-extrabold tracking-tight">P</span>
        </div>
        <span className="font-bold text-slate-900 dark:text-white text-[15px] tracking-tight">PTE 备考</span>
      </div>

      <NavItem to="/" end>首页</NavItem>

      <NavItem to="/review">
        复习
        {dueCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
            bg-red-500 text-white text-[10px] font-bold rounded-full">
            {dueCount > 99 ? '99+' : dueCount}
          </span>
        )}
      </NavItem>

      <NavItem to="/templates">模板</NavItem>

      <div className="ml-auto flex items-center gap-1">
        <NotifyToggle enabled={enabled} permission={permission} supported={supported} onToggle={toggle} />
        <ThemeToggle />
      </div>
    </nav>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <Nav />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Routes>
              <Route path="/"          element={<Home />} />
              <Route path="/review"    element={<Review />} />
              <Route path="/templates" element={<Templates />} />
            </Routes>
          </div>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
