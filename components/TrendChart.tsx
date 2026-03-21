'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { MonthlyStats } from '@/types';
import { formatCurrency, getMonthLabel } from '@/lib/dataUtils';

interface Props {
  allStats: MonthlyStats[];
  selectedYear: number;
  selectedMonth: number;
}

function fmt(v: number) {
  if (v >= 10000) return `${Math.round(v / 10000)}万`;
  return `${v}`;
}

export default function TrendChart({ allStats, selectedYear, selectedMonth }: Props) {
  const data = allStats.map(s => ({
    label: `${s.month}月`,
    year: s.year,
    month: s.month,
    収入: s.totalIncome,
    支出: s.totalExpense,
    収支: s.netBalance,
    isSelected: s.year === selectedYear && s.month === selectedMonth,
    isIncomplete: s.isIncomplete,
  }));

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 mb-1">月次推移</h2>
      <p className="text-xs text-slate-400 mb-3">
        ※ ★は月途中のデータ
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(val, idx) => {
              const d = data[idx];
              return d?.isIncomplete ? `${val}★` : val;
            }}
          />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={fmt} width={36} />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            labelFormatter={(_, payload) => {
              if (!payload?.[0]) return '';
              const d = payload[0].payload;
              return getMonthLabel(d.year, d.month) + (d.isIncomplete ? '（データ不完全）' : '');
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey="収入" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="支出" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="収支" radius={[4, 4, 0, 0]} maxBarSize={32}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.収支 >= 0 ? '#3b82f6' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-1">
        {[['収入', '#22c55e'], ['支出', '#f97316'], ['収支', '#3b82f6']].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
