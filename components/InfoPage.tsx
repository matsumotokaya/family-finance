'use client';
import Link from 'next/link';
import { AppConfig, Transaction } from '@/types';
import {
  getAvailableMonths, getMonthlyStats, formatCurrency, monthsUntil,
} from '@/lib/dataUtils';
import SavingsGoal from './SavingsGoal';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';

const MONTHLY_HOUSING_LOAN = 115410;

interface Props {
  config: AppConfig;
  transactions: Transaction[];
}

export default function InfoPage({ config, transactions }: Props) {
  // Use latest available month for savings goal
  const months = getAvailableMonths(transactions);
  const latest = months[months.length - 1];
  const stats = getMonthlyStats(
    transactions, latest.year, latest.month,
    config.incompleteMonths, config.standardMonthlyIncome
  );

  const remaining = monthsUntil(config.mortgageEndYear, config.mortgageEndMonth);
  const years = Math.floor(remaining / 12);
  const mos = remaining % 12;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="w-9" />
          <h1 className="text-sm font-medium opacity-70">松本家の家計簿</h1>
          <HamburgerMenu />
        </div>
        <p className="text-xl font-black mt-2 pb-1">その他・設定情報</p>
      </PageHeader>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-12">

        {/* Data source overview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 mb-3">このアプリのデータについて</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0">🏦</span>
              <div>
                <p className="text-sm font-bold text-slate-800">収支の基本データ — 三菱UFJ銀行</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  給与・児童手当・各種入金の収入と、カード引き落とし・現金引き出しなどの支出を管理しています。毎月、アプリの入出金明細のスクリーンショットからデータを更新しています。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0">🏠</span>
              <div>
                <p className="text-sm font-bold text-slate-800">住宅ローン返済 — りそな銀行</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  りそな銀行はローン返済専用口座として使用しています。毎月{formatCurrency(MONTHLY_HOUSING_LOAN)}（元利合計）が自動引き落とされます。同じくスクリーンショットからデータを更新しています。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0">💳</span>
              <div>
                <p className="text-sm font-bold text-slate-800">支出の内訳 — VIEWカード・ルミネカード</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  VIEWカードは夫（夏弥）・妻（未来）の2枚が発行されており、妻のカードは月{formatCurrency(50000)}の利用上限が設定されています。ルミネカードは夫名義のメインカードです。毎月、カード会社サイトからCSVをダウンロードして更新します。
                </p>
                <Link href="/cards" className="inline-block mt-2 text-xs font-bold text-blue-600">
                  カード明細を見る →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Savings goal */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 px-1 mb-2">月次貯蓄目標</h2>
          <SavingsGoal stats={stats} config={config} />
        </div>

        {/* Mortgage countdown */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 px-1 mb-2">住宅ローン減税</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">住宅ローン減税 終了まで</p>
                <p className="text-3xl font-black text-amber-700">
                  {years > 0 ? `${years}年${mos}ヶ月` : `${mos}ヶ月`}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {config.mortgageEndYear}年{config.mortgageEndMonth}月に終了予定
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">終了後の追加負担</p>
                <p className="text-xl font-black text-red-600">+{formatCurrency(MONTHLY_HOUSING_LOAN)}/月</p>
                <p className="text-xs text-slate-400">年間 {formatCurrency(MONTHLY_HOUSING_LOAN * 12)}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                <span className="font-bold">住宅ローン減税とは：</span>
                住宅ローン残高の一定割合が所得税・住民税から控除される制度です。この控除が12月の給与（年末調整）に反映されるため、12月の手取り額が他の月より大きくなります。
              </p>
              <p>
                <span className="font-bold text-red-600">2028年12月に終了します。</span>
                それ以降は毎月{formatCurrency(MONTHLY_HOUSING_LOAN)}がそのまま支出として残ります。年間で{formatCurrency(MONTHLY_HOUSING_LOAN * 12)}の追加負担になるため、終了までに毎月の支出を抑えて貯蓄を増やしておくことが重要です。
              </p>
            </div>
          </div>
        </div>

        {/* Config summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 mb-3">現在の設定値</h2>
          <dl className="space-y-2 text-sm">
            {[
              ['標準収入（見込み収支の基準）', formatCurrency(config.standardMonthlyIncome)],
              ['月次貯蓄目標', formatCurrency(config.monthlyTargetSavings)],
              ['VIEWカード（未来）上限', formatCurrency(50000)],
              ['住宅ローン減税 終了予定', `${config.mortgageEndYear}年${config.mortgageEndMonth}月`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                <dt className="text-slate-500 text-xs">{label}</dt>
                <dd className="font-bold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-400 mt-3">設定変更は data/config.json を編集してください</p>
        </div>

      </main>
    </div>
  );
}
