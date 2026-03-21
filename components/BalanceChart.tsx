'use client';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Transaction } from '@/types';
import { buildBalanceSeries, BalancePoint } from '@/lib/balanceUtils';
import { useMemo } from 'react';

function fmt(v: number) {
  if (v >= 1000000) return `${(v / 10000).toFixed(0)}万`;
  if (v >= 10000)   return `${Math.round(v / 10000)}万`;
  return `${v}`;
}

function fmtFull(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data: BalancePoint = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-40">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold">{fmtFull(p.value)}</span>
        </div>
      ))}
      {data?.event && (
        <p className="text-slate-400 mt-1.5 border-t border-slate-100 pt-1.5">{data.event}</p>
      )}
    </div>
  );
};

export default function BalanceChart({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => buildBalanceSeries(transactions), [transactions]);

  if (data.length === 0) return null;

  const allValues = data.flatMap(d => [d.mufg ?? 0, d.resona ?? 0, d.total ?? 0]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const yMin = Math.floor(minVal / 100000) * 100000;
  const yMax = Math.ceil(maxVal / 100000) * 100000;

  return (
    <div className="bg-white rounded-2xl p-4 pb-6 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 mb-0.5">口座残高の推移</h2>
      <p className="text-xs text-slate-400 mb-4">2025年12月〜現在（三菱UFJ ＋ りそな）</p>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
            domain={[yMin, yMax]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => <span style={{ fontSize: 11, color: '#64748b' }}>{val}</span>}
          />

          {/* Resona as thin line */}
          <Line
            type="stepAfter"
            dataKey="resona"
            name="りそな"
            stroke="#22c55e"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* MUFG as area */}
          <Area
            type="stepAfter"
            dataKey="mufg"
            name="三菱UFJ"
            stroke="#3b82f6"
            fill="#eff6ff"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Total as bold line on top */}
          <Line
            type="stepAfter"
            dataKey="total"
            name="合計"
            stroke="#0f172a"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#0f172a', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Current balance summary */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        {/* MUFG + りそな 横並び */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: '三菱UFJ', value: data[data.length - 1].mufg!, color: '#3b82f6' },
            { label: 'りそな',  value: data[data.length - 1].resona!, color: '#22c55e' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
              <p className="text-xl font-black" style={{ color: item.color }}>
                {fmtFull(item.value)}
              </p>
            </div>
          ))}
        </div>
        {/* 合計 — 全幅・大きめ */}
        <div className="text-center border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400 mb-0.5">合計</p>
          <p className="text-3xl font-black text-slate-900">
            {fmtFull(data[data.length - 1].total!)}
          </p>
        </div>
      </div>
    </div>
  );
}
