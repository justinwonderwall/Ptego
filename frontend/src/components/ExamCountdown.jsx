import React, { useState, useEffect } from 'react';
import { api } from '../api';

// PTE score targets roughly equivalent to each IELTS band (per official
// score-comparison tables). Overall isn't published for these bands.
const BAND_TARGETS = {
  '6': { speaking: 54, writing: 51, reading: 48, listening: 47 },
  '7': { speaking: 76, writing: 69, reading: 59, listening: 58 },
  '8': { speaking: 88, writing: 85, reading: 70, listening: 69 },
};
const BANDS = ['6', '7', '8'];

export default function ExamCountdown() {
  const [examDate, setExamDate] = useState(null);
  const [editing, setEditing] = useState(false);
  const [inputDate, setInputDate] = useState('');
  const [targetBand, setTargetBand] = useState(null);

  useEffect(() => {
    api.getSettings().then(s => {
      setExamDate(s.exam_date);
      setInputDate(s.exam_date || '');
      setTargetBand(s.target_band || null);
    });
  }, []);

  const daysLeft = examDate
    ? Math.ceil((new Date(examDate) - new Date(new Date().toDateString())) / 86400000)
    : null;

  const save = () => {
    if (!inputDate) return;
    api.updateSettings({ exam_date: inputDate }).then(s => {
      setExamDate(s.exam_date);
      setEditing(false);
    });
  };

  const selectBand = (band) => {
    const next = targetBand === band ? null : band;
    setTargetBand(next);
    api.updateSettings({ target_band: next });
  };

  const urgencyColor =
    daysLeft === null ? '' :
    daysLeft <= 14    ? 'from-red-500 to-rose-600' :
    daysLeft <= 30    ? 'from-orange-500 to-amber-600' :
                        'from-blue-500 to-indigo-600';

  const targets = targetBand ? BAND_TARGETS[targetBand] : null;

  return (
    <div className={`bg-gradient-to-br ${urgencyColor || 'from-blue-500 to-indigo-600'} rounded-2xl p-6 text-white shadow-lg shadow-blue-500/10`}>
      {editing ? (
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={inputDate}
            onChange={e => setInputDate(e.target.value)}
            className="border border-white/30 rounded-lg px-3 py-2 text-sm bg-white/20 text-white focus:outline-none focus:border-white"
          />
          <button
            onClick={save}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            确认
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-2 text-white/70 hover:text-white text-sm"
          >
            取消
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              {daysLeft !== null ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-bold leading-none">{daysLeft}</span>
                  <div>
                    <div className="text-xl font-medium opacity-90">天</div>
                    <div className="text-sm opacity-60 mt-0.5">距 PTE 考试</div>
                  </div>
                </div>
              ) : (
                <div className="text-white/70">尚未设置考试日期</div>
              )}
              {examDate && (
                <div className="text-xs opacity-50 mt-2">考试日期：{examDate}</div>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-white/70 hover:text-white underline"
            >
              {examDate ? '修改日期' : '设置考试日期'}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-white/15">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-medium opacity-70">目标分数（雅思等效）</span>
              <div className="flex gap-1.5">
                {BANDS.map(band => (
                  <button
                    key={band}
                    onClick={() => selectBand(band)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                      targetBand === band
                        ? 'bg-white text-blue-600 border-white'
                        : 'border-white/30 text-white/80 hover:border-white/60'
                    }`}
                  >
                    雅思 {band} 分
                  </button>
                ))}
              </div>
            </div>

            {targets && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                <ScoreChip label="口语" value={targets.speaking} />
                <ScoreChip label="写作" value={targets.writing} />
                <ScoreChip label="阅读" value={targets.reading} />
                <ScoreChip label="听力" value={targets.listening} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ScoreChip({ label, value }) {
  return (
    <div className="bg-white/15 rounded-lg px-2.5 py-1.5 text-center">
      <div className="text-[10px] opacity-70">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}
