'use client';
import { AppConfig } from '@/types';
import { monthsUntil, formatCurrency } from '@/lib/dataUtils';

const MONTHLY_HOUSING_LOAN = 115410; // ローン月額

export default function MortgageCountdown({ config }: { config: AppConfig }) {
  const remaining = monthsUntil(config.mortgageEndYear, config.mortgageEndMonth);
  const years = Math.floor(remaining / 12);
  const months = remaining % 12;
  const isClose = remaining <= 18;

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${isClose ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 mb-0.5">住宅ローン減税 終了まで</p>
          <p className={`text-2xl font-black ${isClose ? 'text-red-600' : 'text-amber-700'}`}>
            {years > 0 ? `${years}年${months}ヶ月` : `${months}ヶ月`}
          </p>
          <p className="text-xs text-slate-500 mt-1">{config.mortgageEndYear}年{config.mortgageEndMonth}月終了予定</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">終了後の追加負担</p>
          <p className="text-lg font-black text-red-600">+{formatCurrency(MONTHLY_HOUSING_LOAN)}/月</p>
          <p className="text-xs text-slate-400">年間 {formatCurrency(MONTHLY_HOUSING_LOAN * 12)}</p>
        </div>
      </div>
      <p className="text-xs text-slate-600 mt-3 bg-white/60 rounded-lg px-3 py-2">
        💡 2028年以降はローン返済が月{formatCurrency(MONTHLY_HOUSING_LOAN)}の追加支出となります。それまでに貯蓄を増やしましょう。
      </p>
    </div>
  );
}
