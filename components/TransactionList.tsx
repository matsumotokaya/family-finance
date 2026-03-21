'use client';
import { Transaction } from '@/types';
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS, ACCOUNT_LABELS } from '@/lib/dataUtils';

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const sorted = [...transactions]
    .filter(t => t.category !== 'internal_transfer')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm text-center text-slate-400 text-sm">
        取引データがありません
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, Transaction[]> = {};
  sorted.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <h2 className="text-sm font-bold text-slate-700 px-4 pt-4 pb-2">取引明細</h2>
      <div className="divide-y divide-slate-50">
        {Object.entries(grouped).map(([date, txs]) => (
          <div key={date}>
            <div className="px-4 py-1.5 bg-slate-50">
              <span className="text-xs font-bold text-slate-400">
                {date.slice(5).replace('-', '/')}
              </span>
            </div>
            {txs.map(t => {
              const color = CATEGORY_COLORS[t.category];
              const isIncome = t.type === 'income';
              return (
                <div key={t.id} className="flex items-center px-4 py-3 gap-3">
                  {/* Category dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                    <p className="text-xs text-slate-400">
                      {ACCOUNT_LABELS[t.account]} · {CATEGORY_LABELS[t.category]}
                    </p>
                  </div>
                  {/* Amount */}
                  <span className={`text-sm font-bold flex-shrink-0 ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isIncome ? '+' : '−'}{formatCurrency(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
