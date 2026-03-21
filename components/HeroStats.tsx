'use client';
import { useState } from 'react';
import { MonthlyStats, AppConfig, Transaction } from '@/types';
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS, ACCOUNT_LABELS } from '@/lib/dataUtils';

interface Props {
  stats: MonthlyStats;
  config: AppConfig;
}

function TransactionRows({ transactions }: { transactions: Transaction[] }) {
  const sorted = [...transactions]
    .filter(t => t.category !== 'internal_transfer')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return <p className="text-center text-slate-400 text-sm py-4">取引データがありません</p>;
  }

  const grouped: Record<string, Transaction[]> = {};
  sorted.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });

  return (
    <div className="divide-y divide-slate-50">
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date}>
          <div className="px-4 py-1.5 bg-slate-50">
            <span className="text-xs font-bold text-slate-400">
              {date.slice(5).replace('-', '/')}
            </span>
          </div>
          {txs.map(t => {
            const color = CATEGORY_COLORS[t.category];
            const isIncome = t.type === 'income';
            return (
              <div key={t.id} className="flex items-center px-4 py-3 gap-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                  <p className="text-xs text-slate-400">
                    {ACCOUNT_LABELS[t.account]} · {CATEGORY_LABELS[t.category]}
                  </p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                  {isIncome ? '+' : '−'}{formatCurrency(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function HeroStats({ stats, config }: Props) {
  const { totalIncome, totalExpense, netBalance, projectedNetBalance } = stats;
  const projectedDeficit = projectedNetBalance < 0;
  const actualDeficit = netBalance < 0;
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Top row: expense + projected balance */}
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-4 text-center">
          <p className="text-xs text-slate-500 font-medium mb-1">今月の支出</p>
          <p className="text-3xl font-black text-slate-800">{formatCurrency(totalExpense)}</p>
        </div>
        <div className={`p-4 text-center ${projectedDeficit ? 'bg-red-500' : 'bg-emerald-500'}`}>
          <p className="text-xs font-medium mb-1 text-white/80">見込み収支</p>
          <p className="text-3xl font-black text-white">
            {projectedDeficit ? '−' : '+'}{formatCurrency(Math.abs(projectedNetBalance))}
          </p>
          <p className="text-xs text-white/70 mt-0.5">
            標準収入 {formatCurrency(config.standardMonthlyIncome)} 基準
          </p>
        </div>
      </div>

      {/* Bottom row: actual income + actual balance */}
      <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">確定収入</span>
          <span className="text-sm font-bold text-emerald-600">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">確定収支</span>
          <span className={`text-sm font-bold ${actualDeficit ? 'text-red-500' : 'text-emerald-600'}`}>
            {actualDeficit ? '−' : '+'}{formatCurrency(Math.abs(netBalance))}
          </span>
        </div>
      </div>

      {/* Collapsible transaction list */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full border-t border-slate-100 px-4 py-3 flex items-center justify-between active:bg-slate-50 transition-colors"
      >
        <span className="text-xs font-bold text-slate-500">取引明細</span>
        <span className="text-slate-400 text-xs">{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>
      {open && <TransactionRows transactions={stats.transactions} />}
    </div>
  );
}
