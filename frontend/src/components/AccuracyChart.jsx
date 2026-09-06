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

const MODES = [
  { label: '总的', value: 'total'     },
  { label: '细项', value: 'breakdown' },
];

// Each series gets both a color AND a marker shape, so lines stay
// distinguishable even when two values sit close together (color alone
// wasn't enough — see the report that prompted this).
const LINE_COLORS = ['#3b82f6', '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#84cc16'];
const LINE_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'circle'];

function ShapeMarker({ cx, cy, shape, color, size = 4 }) {
  if (cx == null || cy == null || Number.isNaN(cx) || Number.isNaN(cy)) return null;
  const s = size;
  switch (shape) {
    case 'square':
      return <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} fill={color} />;
    case 'triangle':
      return <polygon points={`${cx},${cy - s * 1.2} ${cx - s * 1.15},${cy + s * 0.8} ${cx + s * 1.15},${cy + s * 0.8}`} fill={color} />;
    case 'diamond':
      return <polygon points={`${cx},${cy - s * 1.25} ${cx + s * 1.25},${cy} ${cx},${cy + s * 1.25} ${cx - s * 1.25},${cy}`} fill={color} />;
    case 'cross':
      return (
        <g stroke={color} strokeWidth={2} strokeLinecap="round">
          <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} />
          <line x1={cx - s} y1={cy + s} x2={cx + s} y2={cy - s} />
        </g>
      );
    default:
      return <circle cx={cx} cy={cy} r={s} fill={color} />;
  }
}

function ShapeIcon({ shape, color }) {
  return (
    <svg width="10" height="10" viewBox="-5 -5 10 10" className="shrink-0">
      <ShapeMarker cx={0} cy={0} shape={shape} color={color} size={3.5} />
    </svg>
  );
}

export default function AccuracyChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#334155' : '#f3f4f6';
  const tickColor = isDark ? '#64748b' : '#9ca3af';
  const refColor  = isDark ? '#475569' : '#d1d5db';

  const [range, setRange] = useState('30d');
  const [mode, setMode] = useState('total');
  const [data, setData] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);

  useEffect(() => {
    if (mode === 'total') {
      api.getAccuracy(range, { section: 'Reading' }).then(rows => {
        setData(rows.map(r => ({
          date: r.date ? r.date.slice(5) : '',
          score: r.avg_score_pct != null ? Math.round(r.avg_score_pct) : null,
        })));
        setTasks([]);
      });
    } else {
      api.getAccuracy(range, { section: 'Reading', breakdown: 'true' }).then(({ tasks: t, rows }) => {
        setTasks(t);
        setSelectedTasks(t); // default to showing every task type that has data
        setData(rows.map(r => {
          const point = { date: r.date ? r.date.slice(5) : '' };
          for (const task of t) point[task] = r[task] != null ? Math.round(r[task]) : null;
          return point;
        }));
      });
    }
  }, [range, mode]);

  const avg = mode === 'total' && data.length
    ? Math.round(data.reduce((s, d) => s + (d.score || 0), 0) / data.filter(d => d.score != null).length)
    : null;

  const toggleTask = (task) =>
    setSelectedTasks(prev => prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]);

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">阅读正确率趋势</h3>
          {avg !== null && !isNaN(avg) && (
            <p className="text-xs text-slate-400 mt-0.5">期间平均 {avg}%</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  mode === m.value
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                    : 'text-slate-500 border-slate-200 hover:border-slate-400 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600" />
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
      </div>

      {/* Per-task-type filter — also doubles as the legend (color + shape),
          so you can isolate one Reading task type instead of reading a
          crowded multi-line chart. */}
      {mode === 'breakdown' && tasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tasks.map((task, i) => {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const shape = LINE_SHAPES[i % LINE_SHAPES.length];
            const active = selectedTasks.includes(task);
            return (
              <button
                key={task}
                onClick={() => toggleTask(task)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-slate-300'
                }`}
                style={active ? { backgroundColor: color } : undefined}
              >
                <ShapeIcon shape={shape} color={active ? '#fff' : color} />
                {task}
              </button>
            );
          })}
        </div>
      )}

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm">
          暂无数据——打卡阅读题型时填写正确率后显示
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={mode === 'breakdown' ? 200 : 180}>
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
              formatter={(v, name) => [`${v}%`, mode === 'breakdown' ? name : '正确率']}
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
            {mode === 'total' ? (
              <>
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
              </>
            ) : (
              tasks.map((task, i) => {
                if (!selectedTasks.includes(task)) return null;
                const color = LINE_COLORS[i % LINE_COLORS.length];
                const shape = LINE_SHAPES[i % LINE_SHAPES.length];
                return (
                  <Line
                    key={task}
                    type="monotone"
                    dataKey={task}
                    name={task}
                    stroke={color}
                    strokeWidth={2}
                    dot={(props) => <ShapeMarker key={`${task}-${props.index}`} {...props} shape={shape} color={color} size={3} />}
                    activeDot={(props) => <ShapeMarker key={`${task}-active-${props.index}`} {...props} shape={shape} color={color} size={5} />}
                    connectNulls
                  />
                );
              })
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
