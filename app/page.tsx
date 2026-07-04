import { redirect } from 'next/navigation';
import { getAvailableMonths, getMonthKey } from '@/lib/dataUtils';
import { getBankTransactions } from '@/lib/dataSource';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const transactions = await getBankTransactions();
  const months = getAvailableMonths(transactions);
  const latest = months[months.length - 1];
  redirect(`/${getMonthKey(latest.year, latest.month)}`);
}
