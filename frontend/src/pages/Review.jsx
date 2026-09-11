import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Overview from '../components/Overview';
import Quiz from '../components/Quiz';
import MistakeBook from '../components/MistakeBook';
import { api } from '../api';

const TAB_KEYS = ['overview', 'quiz', 'mistakes'];

export default function Review() {
  const { t } = useTranslation();
  const TABS = TAB_KEYS.map(key => ({ key, label: t(`review.tabs.${key}`) }));
  const [tab, setTab]           = useState('overview');
  const [dueCount, setDueCount] = useState(0);
  const [mistakeDueCount, setMistakeDueCount] = useState(0);

  const refreshBadges = () => {
    api.getReviewStats().then(s => setDueCount(s.due_today)).catch(() => {});
    api.getMistakeStats().then(s => setMistakeDueCount(s.due_today)).catch(() => {});
  };

  useEffect(() => { refreshBadges(); }, []);

  const Badge = ({ n }) => n > 0 ? (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
      bg-red-500 text-white text-[10px] font-bold rounded-full">
      {n > 99 ? '99+' : n}
    </span>
  ) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Tab bar */}
      <div className="flex gap-0 mb-6 border-b border-slate-200 dark:border-slate-700">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              tab === t.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.key === 'quiz' && <Badge n={dueCount} />}
            {t.key === 'mistakes' && <Badge n={mistakeDueCount} />}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'quiz' && <Quiz key={tab} />}
      {tab === 'mistakes' && <MistakeBook key={tab} onChange={refreshBadges} />}
    </div>
  );
}
