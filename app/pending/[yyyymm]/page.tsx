import { notFound } from 'next/navigation';
import PendingDashboard from '@/components/PendingDashboard';
import { getLatestPendingSnapshot, getPendingMonths } from '@/lib/pendingCardUtils';
import { getMonthLabel } from '@/lib/cardUtils';

export async function generateMetadata({ params }: { params: { yyyymm: string } }) {
  return {
    title: `${getMonthLabel(params.yyyymm)}の未確定決済 | 家計ダッシュボード`,
  };
}

export default async function PendingMonthPage({ params }: { params: { yyyymm: string } }) {
  const snapshot = await getLatestPendingSnapshot();
  if (!snapshot) notFound();

  const availableMonths = getPendingMonths(snapshot.transactions);
  if (!availableMonths.includes(params.yyyymm)) notFound();

  return (
    <PendingDashboard
      snapshot={snapshot}
      selectedMonth={params.yyyymm}
      availableMonths={availableMonths}
    />
  );
}
