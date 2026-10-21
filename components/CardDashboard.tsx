'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CardStatement, MonthlySummary, CategorySummary,
  buildMonthlySummaries, getCategoryBreakdown,
  getMonthLabel, CATEGORY_COLORS, CATEGORY_LABELS,
} from '@/lib/cardUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';
import MonthSelector from './MonthSelector';

function fmt(n: number) { return `¥${n.toLocaleString('ja-JP')}`; }
function fmtK(n: number) { return n >= 10000 ? `${Math.round(n / 1000)}k` : `${n}`; }

type CardTab = 'viewMiku' | 'viewNatsuya' | 'lumine';

// The three groups shown everywhere on this page, in display order
const GROUPS: { key: CardTab; label: string; color: string }[] = [
  { key: 'viewMiku', label: '未来 VIEW', color: '#ef4444' },
  { key: 'viewNatsuya', label: '夏弥 VIEW', color: '#f97316' },
  { key: 'lumine', label: '夏弥 ルミネ', color: '#8b5cf6' },
];

function inGroup(tab: CardTab, card: string, person: string): boolean {
  if (tab === 'lumine') return card !== 'view';
  if (card !== 'view') return false;
  return tab === 'viewMiku' ? person.includes('未来') : !person.includes('未来');
}

const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const row: MonthlySummary = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-40">
      <p className="font-bold text-slate-700 mb-1.5">{label}</p>
      <div className="flex justify-between gap-4 mb-1 pb-1 border-b border-slate-100">
        <span className="font-bold text-slate-700">合計</span>
        <span className="font-black">{fmt(row.total)}</span>
      </div>
      {GROUPS.map(g => (
        <div key={g.key} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: g.color }}>{g.label}</span>
          <span className="font-bold">{fmt(row[g.key])}</span>
        </div>
      ))}
    </div>
  );
};

interface Props { statements: CardStatement[]; }

export default function CardDashboard({ statements }: Props) {
  const summaries = useMemo(() => buildMonthlySummaries(statements), [statements]);
  const months = summaries.map(s => s.yyyymm);
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1]);
  const [activeTab, setActiveTab] = useState<CardTab>('viewMiku');

  const selected = summaries.find(s => s.yyyymm === selectedMonth)!;

  // Transactions for selected month
  const selectedTxns = useMemo(() => {
    return statements
      .filter(s => s.payment_yyyymm === selectedMonth)
      .flatMap(s => s.transactions.map(t => ({ ...t, card: s.card, card_label: s.card_label })));
  }, [statements, selectedMonth]);

  const activeTxns = selectedTxns.filter(t => t.net > 0 && inGroup(activeTab, t.card, t.person));
  const breakdown = useMemo(() => getCategoryBreakdown(activeTxns), [activeTxns]);
  const maxBreakdown = breakdown[0]?.amount || 1;


  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <PageHeader noPadBottom>
        <div className="flex items-center justify-between pb-3">
          <div className="w-9" />
          <div className="text-center">
            <h1 className="text-sm font-medium opacity-70">カード明細</h1>
            <p className="text-xs text-white/50">VIEWカード（未来）・ルミネカード（夏弥）</p>
          </div>
          <HamburgerMenu />
        </div>
        <MonthSelector
          options={summaries.map(s => ({ key: s.yyyymm, label: getMonthLabel(s.yyyymm) }))}
          selectedKey={selectedMonth}
          onSelect={setSelectedMonth}
          note="支払月"
        />
      </PageHeader>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-3 pb-12">

        {/* Monthly summary trend */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700">月次推移</h2>
          <p className="text-xs text-slate-400 mb-3">
            {summaries[0].label}〜{summaries[summaries.length - 1].label}（支払月・取り込み済みの全期間）
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={summaries}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              onClick={(e: any) => e?.activePayload?.[0] && setSelectedMonth(e.activePayload[0].payload.yyyymm)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={v => v.replace('年', '/').replace('月', '')} minTickGap={8} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={fmtK} width={36} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: '#f1f5f9' }} />
              {GROUPS.map((g, i) => (
                <Bar key={g.key} dataKey={g.key} name={g.label} stackId="a" fill={g.color} maxBarSize={28}
                  radius={i === GROUPS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
                  {summaries.map(s => (
                    <Cell key={s.yyyymm} fillOpacity={s.yyyymm === selectedMonth ? 1 : 0.45} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-1">
            {GROUPS.map(g => (
              <span key={g.key} className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: g.color }} />{g.label}
              </span>
            ))}
          </div>
        </div>

        {/* Month total and its three parts */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-baseline justify-between">
            <p className="text-xs font-bold text-slate-500">{selected.label}支払分の合計</p>
            <p className="text-3xl font-black text-slate-900">{fmt(selected.total)}</p>
          </div>
          <div className="grid grid-cols-3 border-t border-slate-100 divide-x divide-slate-100">
            {GROUPS.map(g => (
              <div key={g.key} className="p-3 text-center">
                <p className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />{g.label}
                </p>
                <p className="text-base font-black text-slate-800">{fmt(selected[g.key])}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction breakdown — tabbed by person */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {GROUPS.map(g => (
              <button
                key={g.key}
                onClick={() => setActiveTab(g.key)}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                  activeTab === g.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {g.label}
                <span className="block font-medium opacity-80">{fmt(selected[g.key])}</span>
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
