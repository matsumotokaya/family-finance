'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label,
} from 'recharts';
import { useMemo } from 'react';
import { CardStatement, buildMonthlySummaries } from '@/lib/cardUtils';

function fmt(v: number) {
  if (v >= 10000) return `${Math.round(v / 10000)}万`;
  return `${v}`;
}

function fmtFull(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum: number, p: any) => sum + (p.value ?? 0), 0);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-44">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold">{fmtFull(p.value)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 mt-1.5 pt-1.5 border-t border-slate-100">
        <span className="text-slate-600 font-bold">合計</span>
        <span className="font-bold text-slate-900">{fmtFull(total)}</span>
      </div>
    </div>
  );
};

export default function CardTrendChart({ statements }: { statements: CardStatement[] }) {
  const data = useMemo(() => {
    const summaries = buildMonthlySummaries(statements);
    return summaries
      .filter(s => s.yyyymm >= '202512')
      .map(s => ({
        label: s.label,
        yyyymm: s.yyyymm,
        view: s.viewMiku + s.viewNatsuya,
        lumine: s.lumine,
      }));
  }, [statements]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-4 pb-6 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 mb-0.5">カード請求額の推移</h2>
      <p className="text-xs text-slate-400 mb-4">2025年12月〜現在（VIEWカード ＋ ルミネカード）</p>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={fmt}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => <span style={{ fontSize: 11, color: '#64748b' }}>{val}</span>}
          />
          <ReferenceLine y={40000} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}>
            <Label value="上限 ¥4万" position="insideTopRight" fontSize={10} fill="#ef4444" />
          </ReferenceLine>
          <Line
            type="monotone"
            dataKey="view"
            name="VIEWカード"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="lumine"
            name="ルミネカード"
            stroke="#475569"
            strokeWidth={2}
            dot={{ r: 4, fill: '#475569', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
