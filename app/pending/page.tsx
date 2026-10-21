import Link from 'next/link';
import { redirect } from 'next/navigation';
import HamburgerMenu from '@/components/HamburgerMenu';
import PageHeader from '@/components/PageHeader';
import { getLatestPendingSnapshot, getPendingMonths } from '@/lib/pendingCardUtils';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '未確定決済情報 | 家計ダッシュボード',
};

export default async function PendingPage() {
  const snapshot = await getLatestPendingSnapshot();
  if (!snapshot) {
    redirect('/');
  }

  const months = getPendingMonths(snapshot.transactions);
  if (months.length > 0) {
    redirect(`/pending/${months[0]}`);
  }

  // Everything pasted so far is already in confirmed statements
  return (
    <div className="min-h-screen bg-slate-100">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="w-9" />
          <h1 className="text-sm font-medium opacity-70">未確定決済</h1>
          <HamburgerMenu />
        </div>
      </PageHeader>
      <main className="max-w-xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-slate-600 space-y-2">
          <p className="font-bold text-slate-800">未確定の明細はありません</p>
          <p>取り込んだ未確定決済は、すべて確定明細に反映済みです。確定分は「カード明細」で確認できます。</p>
          <Link href="/cards" className="inline-block text-xs font-bold text-blue-600">カード明細を見る →</Link>
        </div>
      </main>
    </div>
  );
}
