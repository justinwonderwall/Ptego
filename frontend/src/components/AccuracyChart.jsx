import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { api } from '../api';
import { useTheme } from '../useTheme';

const RANGES = [
  { label: '7天',  value: '7d'  },
  { label: '30天', value: '30d' },
  { label: '全部', value: 'all' },
];

export default function AccuracyChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#334155' : '#f3f4f6';
  const tickColor = isDark ? '#64748b' : '#9ca3af';
  const refColor  = isDark ? '#475569' : '#d1d5db';

  const [range, setRange] = useState('30d');
  const [data, setData] = useState([]);

  useEffect(() => {
    api.getAccuracy(range).then(rows => {
      setData(rows.map(r => ({
        date: r.date ? r.date.slice(5) : '',
        score: r.avg_score_pct != null ? Math.round(r.avg_score_pct) : null,
      })));
    });
  }, [range]);

  const avg = data.length
    ? Math.round(data.reduce((s, d) => s + (d.score || 0), 0) / data.filter(d => d.score != null).length)
    : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">正确率趋势</h3>
          {avg !== null && !isNaN(avg) && (
            <p className="text-xs text-slate-400 mt-0.5">期间平均 {avg}%</p>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                range === r.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'text-slate-500 border-slate-200 hover:border-blue-300 dark:border-slate-600 dark:text-slate-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm">
          暂无数据——打卡时填写正确率后显示
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              formatter={v => [`${v}%`, '正确率']}
              contentStyle={{
                fontSize: 12,
                background: isDark ? '#1e293b' : '#fff',
                border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                color: isDark ? '#e2e8f0' : '#0f172a',
              }}
              labelStyle={{ color: isDark ? '#94a3b8' : '#6b7280' }}
            />
            {avg && <ReferenceLine y={avg} stroke={refColor} strokeDasharray="4 4" />}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
