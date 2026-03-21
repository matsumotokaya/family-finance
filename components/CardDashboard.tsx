'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CardStatement, MonthlySummary, CategorySummary,
  buildMonthlySummaries, getCategoryBreakdown,
  VIEW_CARD_MIKU_LIMIT, getMonthLabel, CATEGORY_COLORS, CATEGORY_LABELS,
} from '@/lib/cardUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

function fmt(n: number) { return `¥${n.toLocaleString('ja-JP')}`; }
function fmtK(n: number) { return n >= 10000 ? `${Math.round(n / 1000)}k` : `${n}`; }

interface Props { statements: CardStatement[]; }

export default function CardDashboard({ statements }: Props) {
  const summaries = useMemo(() => buildMonthlySummaries(statements), [statements]);
  const months = summaries.map(s => s.yyyymm);
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1]);
  const [activeTab, setActiveTab] = useState<'miku' | 'natsuya'>('miku');

  const selected = summaries.find(s => s.yyyymm === selectedMonth)!;

  // Transactions for selected month
  const selectedTxns = useMemo(() => {
    return statements
      .filter(s => s.payment_yyyymm === selectedMonth)
      .flatMap(s => s.transactions.map(t => ({ ...t, card: s.card, card_label: s.card_label })));
  }, [statements, selectedMonth]);

  const mikuTxns = selectedTxns.filter(t => t.person.includes('未来') && t.net > 0);
  const natsuyaTxns = selectedTxns.filter(t => t.person.includes('夏弥') && t.net > 0);

  const activeTxns = activeTab === 'miku' ? mikuTxns : natsuyaTxns;
  const breakdown = useMemo(() => getCategoryBreakdown(activeTxns), [activeTxns]);
  const maxBreakdown = breakdown[0]?.amount || 1;

  const mikuRatio = Math.min((selected.viewMiku / VIEW_CARD_MIKU_LIMIT) * 100, 200);
  const isOver = selected.viewMiku > VIEW_CARD_MIKU_LIMIT;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 pt-5 pb-4 shadow-lg">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-white/60 text-sm">← ダッシュボード</Link>
          </div>
          <h1 className="text-xl font-black">カード明細分析</h1>
          <p className="text-xs text-white/60 mt-0.5">VIEWカード（未来）・ルミネカード（夏弥）</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-3 pb-12">

        {/* Month selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {summaries.map(s => (
            <button
              key={s.yyyymm}
              onClick={() => setSelectedMonth(s.yyyymm)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold whitespace-nowrap flex-shrink-0 transition-colors ${
                selectedMonth === s.yyyymm
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 shadow-sm'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ViewCard 未来 — MAIN ALERT */}
        <div className={`rounded-2xl p-4 shadow-sm ${isOver ? 'bg-red-600 text-white' : 'bg-emerald-50 border border-emerald-200'}`}>
          <p className={`text-xs font-bold mb-1 ${isOver ? 'text-white/80' : 'text-slate-500'}`}>
            VIEWカード（未来） — 月¥50,000 上限
          </p>
          <div className="flex items-end justify-between">
            <p className={`text-3xl font-black ${isOver ? 'text-white' : 'text-emerald-700'}`}>
              {fmt(selected.viewMiku)}
            </p>
            {isOver && (
              <p className="text-xl font-black text-white bg-red-800/40 rounded-xl px-3 py-1">
                ⚠️ +{fmt(selected.viewMiku - VIEW_CARD_MIKU_LIMIT)} 超過
              </p>
            )}
          </div>
          {/* Overage bar */}
          <div className="mt-3 w-full bg-white/30 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full ${isOver ? 'bg-yellow-300' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(mikuRatio, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${isOver ? 'text-white/70' : 'text-slate-400'}`}>¥0</span>
            <span className={`text-xs font-bold ${isOver ? 'text-white/70' : 'text-slate-400'}`}>
              上限 {fmt(VIEW_CARD_MIKU_LIMIT)}
            </span>
          </div>
        </div>

        {/* Monthly summary trend */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-3">月次推移</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={summaries} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={v => v.replace('年', '/').replace('月', '')} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={fmtK} width={36} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <ReferenceLine y={VIEW_CARD_MIKU_LIMIT} stroke="#ef4444" strokeDasharray="4 2"
                label={{ value: '上限¥5万', fontSize: 9, fill: '#ef4444', position: 'right' }} />
              <Bar dataKey="viewMiku" name="未来VIEW" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} maxBarSize={28} />
              <Bar dataKey="viewNatsuya" name="夏弥VIEW" stackId="a" fill="#f97316" maxBarSize={28} />
              <Bar dataKey="lumine" name="ルミネ" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-1">
            {[['未来VIEW', '#ef4444'], ['夏弥VIEW', '#f97316'], ['ルミネ', '#8b5cf6']].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />{l}
              </span>
            ))}
          </div>
        </div>

        {/* Month card totals */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '未来 VIEW', amount: selected.viewMiku, alert: isOver },
            { label: '夏弥 VIEW', amount: selected.viewNatsuya, alert: false },
            { label: '夏弥 ルミネ', amount: selected.lumine, alert: false },
          ].map(item => (
            <div key={item.label} className={`rounded-2xl p-3 text-center shadow-sm ${item.alert ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className={`text-base font-black ${item.alert ? 'text-red-600' : 'text-slate-800'}`}>
                {fmt(item.amount)}
              </p>
            </div>
          ))}
        </div>

        {/* Transaction breakdown — tabbed by person */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {[{ key: 'miku', label: `未来 VIEW  ${fmt(selected.viewMiku)}` },
              { key: 'natsuya', label: `夏弥 ルミネ  ${fmt(selected.lumine)}` }].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'miku' | 'natsuya')}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category breakdown */}
          <div className="p-4">
            <p className="text-xs font-bold text-slate-500 mb-2">カテゴリ別</p>
            <div className="space-y-1.5">
              {breakdown.slice(0, 8).map(b => (
                <div key={b.category}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-600">{b.label}</span>
                    <span className="font-bold text-slate-800">{fmt(b.amount)}（{b.count}件）</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full"
                      style={{ width: `${(b.amount / maxBreakdown) * 100}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction list */}
          <div className="border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 px-4 py-2">明細（{activeTxns.length}件）</p>
            <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
              {activeTxns
                .sort((a, b) => b.net - a.net)
                .map((t, i) => (
                  <div key={i} className="flex items-center px-4 py-2.5 gap-2">
                    <span className="text-xs text-slate-400 w-14 flex-shrink-0">{t.date.slice(5).replace('-', '/')}</span>
                    <span className="flex-1 text-xs text-slate-700 truncate">{t.shop}</span>
                    <span className="text-sm font-bold text-red-500 flex-shrink-0">{fmt(t.net)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
