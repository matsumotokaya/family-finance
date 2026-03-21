'use client';
import { CategoryItem } from '@/types';
import { formatCurrency } from '@/lib/dataUtils';

export default function CategoryChart({ breakdown }: { breakdown: CategoryItem[] }) {
  if (breakdown.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm text-center text-slate-400 text-sm">
        支出データがありません
      </div>
    );
  }

  const maxAmount = breakdown[0].amount;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 mb-3">支出内訳</h2>
      <div className="space-y-2">
        {breakdown.map(item => (
          <div key={item.category}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-medium text-slate-600">{item.label}</span>
              <span className="text-xs font-bold text-slate-800">{formatCurrency(item.amount)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${(item.amount / maxAmount) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
