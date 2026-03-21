'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { CardStatement } from '@/lib/cardUtils';
import MonthBillingCard, { calcMonthBilling } from './MonthBillingCard';

export default function CardBillingSummary({ statements, yyyymm }: { statements: CardStatement[]; yyyymm: string }) {
  const billing = useMemo(() => calcMonthBilling(statements, yyyymm), [statements, yyyymm]);

  return (
    <div>
      <MonthBillingCard billing={billing} />
      <Link href="/card-bills">
        <div className="mt-2 text-center py-2.5 bg-white rounded-xl shadow-sm text-xs font-bold text-slate-500 active:bg-slate-50 transition-colors">
          月次請求額を見る →
        </div>
      </Link>
    </div>
  );
}
