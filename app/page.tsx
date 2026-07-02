import { redirect } from 'next/navigation';
import transactionsData from '@/data/transactions.json';
import { Transaction } from '@/types';
import { getAvailableMonths, getMonthKey } from '@/lib/dataUtils';

export default function Home() {
  const months = getAvailableMonths(transactionsData.transactions as Transaction[]);
  const latest = months[months.length - 1];
  redirect(`/${getMonthKey(latest.year, latest.month)}`);
}
