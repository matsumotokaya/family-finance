'use client';
import { MonthlyStats, AppConfig } from '@/types';
import { formatCurrency } from '@/lib/dataUtils';

interface Props {
  stats: MonthlyStats;
  config: AppConfig;
}

export default function SavingsGoal({ stats, config }: Props) {
  const { projectedNetBalance } = stats;
  const target = config.monthlyTargetSavings;
  const isDeficit = projectedNetBalance < 0;
  const ratio = isDeficit ? 0 : Math.min((projectedNetBalance / target) * 100, 100);
  const achieved = projectedNetBalance >= target;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-slate-700">月次貯蓄目標</h2>
        <span className="text-sm font-bold text-slate-500">目標 {formatCurrency(target)}/月</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-2">
        <div
          className={`h-4 rounded-full transition-all duration-500 ${
            isDeficit ? 'bg-red-500' : achieved ? 'bg-emerald-500' : 'bg-amber-400'
          }`}
          style={{ width: `${ratio}%` }}
        />
      </div>

      {/* Status message */}
      <p className={`text-sm font-semibold text-center ${
        isDeficit ? 'text-red-600' : achieved ? 'text-emerald-600' : 'text-amber-600'
      }`}>
        {isDeficit
          ? `⚠️ 標準収入を超過 — 貯蓄ゼロです`
          : achieved
          ? `✅ 目標達成見込み！ ${formatCurrency(projectedNetBalance)} の余裕`
          : `📉 目標まであと ${formatCurrency(target - projectedNetBalance)} 不足`}
      </p>
      <p className="text-xs text-slate-400 text-center mt-1">
        ※ 標準収入 {formatCurrency(config.standardMonthlyIncome)} 基準
      </p>
    </div>
  );
}
