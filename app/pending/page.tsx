import { redirect } from 'next/navigation';
import { getLatestPendingSnapshot, getPendingMonths } from '@/lib/pendingCardUtils';

export const metadata = {
  title: '未確定決済情報 | 家計ダッシュボード',
};

export default async function PendingPage() {
  const snapshot = await getLatestPendingSnapshot();
  if (!snapshot) {
    redirect('/');
  }

  const months = getPendingMonths(snapshot.transactions);
  redirect(`/pending/${months[0]}`);
}
