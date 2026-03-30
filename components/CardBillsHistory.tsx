'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { CardStatement } from '@/lib/cardUtils';
import MonthBillingCard, { calcMonthBilling } from './MonthBillingCard';
import CardTrendChart from './CardTrendChart';

export default function CardBillsHistory({ statements }: { statements: CardStatement[] }) {
  const months = useMemo(() => {
    const yyyymms = Array.from(new Set(statements.map(s => s.payment_yyyymm)))
      .filter(m => m >= '202512')
      .sort((a, b) => b.localeCompare(a)); // 降順
    return yyyymms.map(m => calcMonthBilling(statements, m));
  }, [statements]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 bg-slate-900 text-white px-4 pt-5 pb-3 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-white/70 text-sm font-bold">← 戻る</Link>
          <h1 className="text-sm font-medium opacity-70">月次請求額</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-4 pb-12">
        <CardTrendChart statements={statements} />
        {months.map(billing => (
          <MonthBillingCard key={billing.yyyymm} billing={billing} expandable />
        ))}
      </main>
    </div>
  );
}
