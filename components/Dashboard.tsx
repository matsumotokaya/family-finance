'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { Transaction, AppConfig } from '@/types';
import {
  getAvailableMonths, getMonthlyStats, getMonthKey, getMonthLabel,
} from '@/lib/dataUtils';
import HeroStats from './HeroStats';
import BalanceChart from './BalanceChart';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';

interface Props {
  transactions: Transaction[];
  config: AppConfig;
  selectedMonthKey?: string;
}

export default function Dashboard({ transactions, config, selectedMonthKey }: Props) {
  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const monthKeys = useMemo(
    () => availableMonths.map(({ year, month }) => getMonthKey(year, month)),
    [availableMonths]
  );
  const selectedIndex = selectedMonthKey
    ? Math.max(0, monthKeys.indexOf(selectedMonthKey))
    : availableMonths.length - 1;

  const { year, month } = availableMonths[selectedIndex];
  const stats = useMemo(
    () => getMonthlyStats(transactions, year, month, config.incompleteMonths, config.standardMonthlyIncome),
    [transactions, year, month, config.incompleteMonths, config.standardMonthlyIncome]
  );
  const isDeficit = stats.netBalance < 0;
  const prevHref = selectedIndex > 0 ? `/${monthKeys[selectedIndex - 1]}` : null;
  const nextHref = selectedIndex < availableMonths.length - 1 ? `/${monthKeys[selectedIndex + 1]}` : null;

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
          {prevHref ? (
            <Link
              href={prevHref}
              className="px-4 py-1.5 rounded-xl bg-white/20 text-sm font-bold active:scale-95 transition-transform"
            >
              ← 前月
            </Link>
          ) : (
            <span className="px-4 py-1.5 rounded-xl bg-white/20 text-sm font-bold opacity-30 cursor-not-allowed">
              ← 前月
            </span>
          )}
          <div className="text-center">
            <p className="text-2xl font-black">{getMonthLabel(year, month)}</p>
            {stats.isIncomplete && (() => {
              const latest = [...stats.transactions].sort((a, b) => b.date.localeCompare(a.date))[0];
              const d = latest ? new Date(latest.date) : null;
              const label = d ? `※ ${d.getMonth() + 1}月${d.getDate()}日時点` : '※ 月途中のデータ';
              return <p className="text-xs opacity-60">{label}</p>;
            })()}
          </div>
          {nextHref ? (
            <Link
              href={nextHref}
              className="px-4 py-1.5 rounded-xl bg-white/20 text-sm font-bold active:scale-95 transition-transform"
            >
              翌月 →
            </Link>
          ) : (
            <span className="px-4 py-1.5 rounded-xl bg-white/20 text-sm font-bold opacity-30 cursor-not-allowed">
              翌月 →
            </span>
          )}
        </div>
      </PageHeader>

      <main className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-4 pb-12">
        {/* Deficit alert banner */}
        {isDeficit && (
          <div className="bg-red-600 text-white rounded-2xl p-5 text-center shadow-lg">
            <p className="text-4xl font-black">⚠️</p>
            <p className="text-2xl font-black mt-1">今月は赤字です</p>
            <p className="text-lg font-bold mt-1">
              収入 ¥{stats.totalIncome.toLocaleString()} / 支出 ¥{stats.totalExpense.toLocaleString()}
            </p>
            <p className="text-3xl font-black mt-1">
              −¥{Math.abs(stats.netBalance).toLocaleString()}
            </p>
            <p className="text-sm mt-3 opacity-80">家族全員で支出を見直しましょう。</p>
          </div>
        )}

        {/* Main stats */}
        <HeroStats stats={stats} />

        {/* Balance over time */}
        <BalanceChart transactions={transactions} />
        <p className="text-center text-xs text-slate-400 pb-2">
          データは毎月更新されます
        </p>
      </main>
    </div>
  );
}
