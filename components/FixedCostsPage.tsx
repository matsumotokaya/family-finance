'use client';
import Link from 'next/link';
import { formatCurrency } from '@/lib/dataUtils';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';

// Planning model for reviewing fixed costs, not a contract ledger; kept apart from actual statements.
type Status = 'reported' | 'provisional' | 'unknown';
type Owner = 'personal' | 'family' | 'unknown';

interface FixedCostItem {
  name: string;
  owner: Owner;
  cycle: 'monthly' | 'yearly';
  amount: number | null;
  currency: 'JPY' | 'USD';
  status: Status;
  note: string;
}

export interface FixedCostsData {
  asOf: string;
  source: string;
  usdJpy: number;
  items: FixedCostItem[];
  excluded: string[];
}

const STATUS_LABEL: Record<Status, string> = {
  reported: '申告額',
  provisional: '仮',
  unknown: '金額未確認',
};

const STATUS_STYLE: Record<Status, string> = {
  reported: 'bg-emerald-50 text-emerald-700',
  provisional: 'bg-amber-50 text-amber-700',
  unknown: 'bg-slate-100 text-slate-500',
};

const OWNER_LABEL: Record<Owner, string> = {
  personal: '個人',
  family: '家族',
  unknown: '区分未確認',
};

function toMonthlyJpy(item: FixedCostItem, usdJpy: number): number | null {
  if (item.amount === null) return null;
  const jpy = item.currency === 'USD' ? item.amount * usdJpy : item.amount;
  return item.cycle === 'yearly' ? jpy / 12 : jpy;
}

function basisLabel(item: FixedCostItem, usdJpy: number): string | null {
  if (item.amount === null) return null;
  const base = item.currency === 'USD'
    ? `${item.amount} USD × ${usdJpy}円`
    : formatCurrency(item.amount);
  return item.cycle === 'yearly' ? `年額 ${base} を月割り` : `月額 ${base}`;
}

export default function FixedCostsPage({ data }: { data: FixedCostsData }) {
  const rows = data.items
    .map(item => ({ item, monthly: toMonthlyJpy(item, data.usdJpy) }))
    .sort((a, b) => (b.monthly ?? -1) - (a.monthly ?? -1));

  const sumBy = (status: Status) =>
    rows.filter(r => r.item.status === status).reduce((s, r) => s + (r.monthly ?? 0), 0);
  const reported = sumBy('reported');
  const provisional = sumBy('provisional');
  const total = reported + provisional;
  const unknownCount = rows.filter(r => r.monthly === null).length;

  return (
    <div className="min-h-screen bg-slate-100">
      <PageHeader>
        <div className="flex items-center justify-between">
          <Link href="/info" className="text-white/70 text-sm font-bold">← その他</Link>
          <h1 className="text-sm font-medium opacity-70"><Link href="/">松本家の家計簿</Link></h1>
          <HamburgerMenu />
        </div>
        <p className="text-xl font-black mt-2 pb-1">固定費（サブスク・定額払い）</p>
      </PageHeader>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-12">

        {/* Total */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">1か月あたりの固定費（モデル）</p>
          <p className="text-4xl font-black text-slate-900 mt-1">
            {formatCurrency(Math.round(total))}
            <span className="text-base font-bold text-slate-400"> /月</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">年間 {formatCurrency(Math.round(total * 12))}</p>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-[11px] font-bold text-emerald-700">申告額</p>
              <p className="text-lg font-black text-emerald-800">{formatCurrency(Math.round(reported))}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-[11px] font-bold text-amber-700">仮（記憶・仮予算・為替仮定）</p>
              <p className="text-lg font-black text-amber-800">{formatCurrency(Math.round(provisional))}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            見直し（解約・プラン変更）を考えるための試算です。実際の請求額ではありません。
            年額の契約は12で割って月額にしています。USDは1 USD＝{data.usdJpy}円で計算しています。
            {unknownCount > 0 && `金額未確認の${unknownCount}件は合計に含めていません。`}
          </p>
        </div>

        {/* Items */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 px-1 mb-2">明細（月額の大きい順）</h2>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100">
            {rows.map(({ item, monthly }) => (
              <div key={item.name} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {OWNER_LABEL[item.owner]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-black ${monthly === null ? 'text-slate-300' : 'text-slate-900'}`}>
                      {monthly === null ? '—' : formatCurrency(Math.round(monthly))}
                    </p>
                    <p className="text-[11px] text-slate-400">{basisLabel(item, data.usdJpy) ?? '合計外'}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Excluded */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 mb-2">このページに含めていないもの</h2>
          <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
            {data.excluded.map(e => <li key={e}>{e}</li>)}
          </ul>
          <p className="text-[11px] text-slate-400 mt-3">
            {data.asOf} 時点の申告をもとに作成（{data.source}）
          </p>
        </div>

      </main>
    </div>
  );
}
