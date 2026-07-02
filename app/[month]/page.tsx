import { notFound } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import transactionsData from '@/data/transactions.json';
import configData from '@/data/config.json';
import { Transaction, AppConfig } from '@/types';
import { getAvailableMonths, getMonthKey, getMonthLabel, parseMonthKey } from '@/lib/dataUtils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { month: string } }) {
  const parsed = parseMonthKey(params.month);
  return {
    title: parsed ? `${getMonthLabel(parsed.year, parsed.month)} | 家計ダッシュボード` : '家計ダッシュボード',
  };
}

export default function MonthlyHomePage({ params }: { params: { month: string } }) {
  const parsed = parseMonthKey(params.month);
  if (!parsed) notFound();

  const transactions = transactionsData.transactions as Transaction[];
  const availableMonths = getAvailableMonths(transactions);
  const monthKey = getMonthKey(parsed.year, parsed.month);
  const exists = availableMonths.some(({ year, month }) => getMonthKey(year, month) === monthKey);
  if (!exists) notFound();

  return (
    <Dashboard
      transactions={transactions}
      config={configData as AppConfig}
      selectedMonthKey={monthKey}
    />
  );
}
