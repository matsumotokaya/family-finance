'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Transaction, AppConfig } from '@/types';
import {
  getAvailableMonths, getMonthlyStats, getMonthKey, getMonthLabel,
} from '@/lib/dataUtils';
import HeroStats from './HeroStats';
import BalanceChart from './BalanceChart';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';
import MonthSelector from './MonthSelector';

interface Props {
  transactions: Transaction[];
  config: AppConfig;
  selectedMonthKey?: string;
}

export default function Dashboard({ transactions, config, selectedMonthKey }: Props) {
  const router = useRouter();
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
    () => getMonthlyStats(transactions, year, month, config.incompleteMonths),
    [transactions, year, month, config.incompleteMonths]
  );
  // Only judge a deficit once the month has closed
  const isDeficit = !stats.isIncomplete && stats.netBalance < 0;
  const monthOptions = availableMonths.map(({ year, month }, i) => ({
    key: monthKeys[i],
    label: getMonthLabel(year, month),
  }));

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDeficit ? 'bg-red-50' : 'bg-slate-100'}`}>
      {/* Header */}
      <PageHeader isAlert={isDeficit} noPadBottom>
        <div className="flex items-center justify-between pb-3">
          <div className="w-9" />
          <h1 className="text-sm font-medium opacity-70"><Link href="/">{config.familyName}の家計簿</Link></h1>
          <HamburgerMenu />
        </div>
        <MonthSelector
          options={monthOptions}
          selectedKey={monthKeys[selectedIndex]}
          onSelect={key => router.push(`/${key}`)}
          note={stats.isIncomplete && (() => {
            const latest = [...stats.transactions].sort((a, b) => b.date.localeCompare(a.date))[0];
            const d = latest ? new Date(latest.date) : null;
            return d ? `※ ${d.getMonth() + 1}月${d.getDate()}日時点` : '※ 月途中のデータ';
          })()}
        />
      </PageHeader>

      <main className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-4 pb-12">
        {/* Deficit alert banner */}
        {isDeficit && (
          <div className="bg-red-600 text-white rounded-2xl p-5 text-center shadow-lg">
            <p className="text-4xl font-black">⚠️</p>
            <p className="text-2xl font-black mt-1">{getMonthLabel(year, month)}は赤字でした</p>
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
