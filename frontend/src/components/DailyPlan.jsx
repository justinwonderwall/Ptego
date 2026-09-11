import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import CheckInModal from './CheckInModal';
import TaskSettingsModal from './TaskSettingsModal';
import TaskHistoryModal from './TaskHistoryModal';

const SECTIONS = ['Speaking', 'Writing', 'Reading', 'Listening'];

const SECTION_STYLES = {
  Speaking:  { label: 'text-teal-600  dark:text-teal-400',  bar: 'from-teal-400 to-cyan-500'  },
  Writing:   { label: 'text-blue-600  dark:text-blue-400',  bar: 'from-blue-400 to-indigo-500'  },
  Reading:   { label: 'text-purple-600 dark:text-purple-400', bar: 'from-purple-400 to-fuchsia-500' },
  Listening: { label: 'text-orange-500 dark:text-orange-400', bar: 'from-orange-400 to-amber-500' },
};

export default function DailyPlan() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [checkInTask, setCheckInTask] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    Promise.all([api.getTodayProgress(), api.getStreak()])
      .then(([t, s]) => { setTasks(t); setStreak(s); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalDone   = tasks.reduce((s, t) => s + (t.done_today || 0), 0);
  const totalTarget = tasks.reduce((s, t) => s + (t.daily_target || 0), 0);
  const overallPct  = totalTarget > 0 ? Math.min(100, Math.round(totalDone / totalTarget * 100)) : 0;

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const bySection = SECTIONS.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.section === s);
    return acc;
  }, {});

  return (
    <div className="card-surface">
      {/* Summary bar */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('home.dailyPlan.todayDone')}</span>
          <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {totalDone} / {totalTarget}
          </span>
          <div className="w-28 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums w-8">
            {overallPct}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm font-medium text-orange-500">
            {t('home.dailyPlan.streak', { count: streak.current_streak })}
            {streak.longest_streak > 0 && (
              <span className="text-slate-400 text-xs font-normal ml-1">
                {t('home.dailyPlan.longestStreak', { count: streak.longest_streak })}
              </span>
            )}
          </div>
          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            title={t('home.dailyPlan.editPlanTitle')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100
              dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sections — two independent columns (Speaking+Reading / Writing+Listening),
          each sized to its own content so a short section doesn't leave a gap
          under it while forcing the opposite column to stretch. */}
      <div className="flex items-start divide-x divide-slate-100/80 dark:divide-slate-700/40">
        {[[SECTIONS[0], SECTIONS[2]], [SECTIONS[1], SECTIONS[3]]].map((column, colIdx) => (
          <div key={colIdx} className="flex-1 min-w-0 flex flex-col divide-y divide-slate-100/80 dark:divide-slate-700/40">
            {column.map(section => {
              const sectionTasks = bySection[section] || [];
              if (!sectionTasks.length) return null;
              const style = SECTION_STYLES[section];
              const secDone   = sectionTasks.reduce((s, t) => s + (t.done_today || 0), 0);
              const secTarget = sectionTasks.reduce((s, t) => s + (t.daily_target || 0), 0);

              return (
                <div key={section} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${style.label}`}>
                      {section}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {secDone}/{secTarget}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sectionTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        barColor={style.bar}
                        onCheckIn={() => setCheckInTask(task)}
                        onShowHistory={() => setHistoryTask(task)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 pointer-events-none">
          {toast}
        </div>
      )}

      {checkInTask && (
        <CheckInModal
          task={checkInTask}
          onClose={() => setCheckInTask(null)}
          onSuccess={(mistakeMsg) => { load(); showToast(mistakeMsg || t('home.dailyPlan.loggedToast')); }}
        />
      )}

      {showSettings && (
        <TaskSettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={() => { load(); showToast(t('home.dailyPlan.planUpdatedToast')); }}
        />
      )}

      {historyTask && (
        <TaskHistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />
      )}
    </div>
  );
}

function TaskRow({ task, barColor, onCheckIn, onShowHistory }) {
  const { t } = useTranslation();
  const done    = task.done_today || 0;
  const target  = task.daily_target || 1;
  const pct     = Math.min(100, Math.round(done / target * 100));
  const complete = done >= target;

  return (
    <div className="flex items-center gap-3 group -mx-1.5 px-1.5 py-0.5 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
      <button
        type="button"
        onClick={onShowHistory}
        title={t('home.dailyPlan.historyTitle')}
        className={`text-sm flex-1 min-w-0 truncate leading-tight text-left hover:underline decoration-dotted underline-offset-2 ${
          complete
            ? 'text-slate-300 dark:text-slate-600 line-through'
            : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {task.name}
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700/70 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              complete ? 'bg-gradient-to-r from-green-400 to-emerald-500' : `bg-gradient-to-r ${barColor}`
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 tabular-nums w-9 text-right">
          {done}/{target}
        </span>
        <button
          onClick={onCheckIn}
          className="text-xs px-2 py-0.5 rounded-md border font-medium transition-all duration-150
            bg-slate-50 text-slate-500 border-slate-200
            hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:shadow-[0_4px_10px_-2px_rgb(59_130_246/0.5)] hover:-translate-y-px
            dark:bg-slate-700/60 dark:text-slate-400 dark:border-slate-600
            dark:hover:bg-blue-500 dark:hover:text-white dark:hover:border-blue-500"
        >
          {t('home.dailyPlan.logButton')}
        </button>
      </div>
    </div>
  );
}
