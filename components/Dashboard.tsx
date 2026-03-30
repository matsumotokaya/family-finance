'use client';
import { useState, useMemo } from 'react';
import { Transaction, AppConfig } from '@/types';
import {
  getAvailableMonths, getMonthlyStats, getMonthLabel,
} from '@/lib/dataUtils';
import HeroStats from './HeroStats';
import BalanceChart from './BalanceChart';
import CardAlertBanner from './CardAlertBanner';
import CardBillingSummary from './CardBillingSummary';
import CardDetailTabs from './CardDetailTabs';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';
import { CardStatement } from '@/lib/cardUtils';

interface Props {
  transactions: Transaction[];
  config: AppConfig;
  cardStatements: CardStatement[];
}

export default function Dashboard({ transactions, config, cardStatements }: Props) {
  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const [selectedIndex, setSelectedIndex] = useState(availableMonths.length - 1);

  const { year, month } = availableMonths[selectedIndex];
  const stats = useMemo(
    () => getMonthlyStats(transactions, year, month, config.incompleteMonths, config.standardMonthlyIncome),
    [transactions, year, month, config.incompleteMonths, config.standardMonthlyIncome]
  );
  // Alert is based on projected balance (standard income − expenses)
  // so the warning triggers even before salary arrives
  const isDeficit = stats.projectedNetBalance < 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDeficit ? 'bg-red-50' : 'bg-slate-100'}`}>
      {/* Header */}
      <PageHeader isAlert={isDeficit} noPadBottom>
        <div className="flex items-center justify-between pb-3">
          <div className="w-9" />
          <h1 className="text-sm font-medium opacity-70">{config.familyName}の家計簿</h1>
          <HamburgerMenu />
        </div>
        {/* Month selector */}
        <div className="flex items-center justify-between pb-4">
          <button
            onClick={() => setSelectedIndex(i => Math.max(0, i - 1))}
            disabled={selectedIndex === 0}
            className="px-4 py-1.5 rounded-xl bg-white/20 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            ← 前月
          </button>
          <div className="text-center">
            <p className="text-2xl font-black">{getMonthLabel(year, month)}</p>
            {stats.isIncomplete && (() => {
              const latest = [...stats.transactions].sort((a, b) => b.date.localeCompare(a.date))[0];
              const d = latest ? new Date(latest.date) : null;
              const label = d ? `※ ${d.getMonth() + 1}月${d.getDate()}日時点` : '※ 月途中のデータ';
              return <p className="text-xs opacity-60">{label}</p>;
            })()}
          </div>
          <button
            onClick={() => setSelectedIndex(i => Math.min(availableMonths.length - 1, i + 1))}
            disabled={selectedIndex === availableMonths.length - 1}
            className="px-4 py-1.5 rounded-xl bg-white/20 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            翌月 →
          </button>
        </div>
      </PageHeader>

      <main className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-4 pb-12">
        {/* Deficit alert banner — triggered by projected balance */}
        {isDeficit && (
          <div className="bg-red-600 text-white rounded-2xl p-5 text-center shadow-lg">
            <p className="text-4xl font-black">⚠️</p>
            <p className="text-2xl font-black mt-1">使いすぎです！</p>
            <p className="text-lg font-bold mt-1">
              標準収入 ¥{config.standardMonthlyIncome.toLocaleString()} に対して
            </p>
            <p className="text-3xl font-black mt-1">
              ¥{Math.abs(stats.projectedNetBalance).toLocaleString()} オーバー
            </p>
            <p className="text-sm mt-3 opacity-80">家族全員で支出を見直しましょう。</p>
          </div>
        )}

        {/* Main stats */}
        <HeroStats stats={stats} config={config} />

        {/* Balance over time */}
        <BalanceChart transactions={transactions} />

        {/* Card billing summary for selected month */}
        <CardBillingSummary
          statements={cardStatements}
          yyyymm={`${year}${String(month).padStart(2, '0')}`}
        />

        {/* Card transaction details */}
        <CardDetailTabs
          statements={cardStatements}
          yyyymm={`${year}${String(month).padStart(2, '0')}`}
        />

        {/* ViewCard 未来 alert */}
        <CardAlertBanner
          statements={cardStatements}
          yyyymm={`${year}${String(month).padStart(2, '0')}`}
        />

        <p className="text-center text-xs text-slate-400 pb-2">
          データは毎月更新されます
        </p>
      </main>
    </div>
  );
}
