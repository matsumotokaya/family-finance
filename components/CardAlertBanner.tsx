'use client';
import Link from 'next/link';
import { CardStatement, buildMonthlySummaries, VIEW_CARD_MIKU_LIMIT } from '@/lib/cardUtils';

export default function CardAlertBanner({ statements }: { statements: CardStatement[] }) {
  const summaries = buildMonthlySummaries(statements);
  const latest = summaries[summaries.length - 1];
  if (!latest) return null;

  const isOver = latest.viewMiku > VIEW_CARD_MIKU_LIMIT;
  const over = latest.viewMiku - VIEW_CARD_MIKU_LIMIT;
  const ratio = Math.min((latest.viewMiku / VIEW_CARD_MIKU_LIMIT) * 100, 200);

  return (
    <Link href="/cards">
      <div className={`rounded-2xl p-4 shadow-sm cursor-pointer active:scale-95 transition-transform ${
        isOver ? 'bg-red-100 border-2 border-red-400' : 'bg-white border border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-bold text-slate-500">VIEWカード（未来） {latest.label}</p>
            <p className={`text-xl font-black mt-0.5 ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
              ¥{latest.viewMiku.toLocaleString()}
              <span className="text-sm font-medium text-slate-400 ml-1">/ 上限 ¥40,000</span>
            </p>
          </div>
          {isOver ? (
            <div className="text-center bg-red-600 text-white rounded-xl px-3 py-2">
              <p className="text-xs font-bold">超過</p>
              <p className="text-sm font-black">+¥{over.toLocaleString()}</p>
            </div>
          ) : (
            <div className="text-center bg-emerald-100 text-emerald-700 rounded-xl px-3 py-2">
              <p className="text-xs font-bold">残り</p>
              <p className="text-sm font-black">¥{(VIEW_CARD_MIKU_LIMIT - latest.viewMiku).toLocaleString()}</p>
            </div>
          )}
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(ratio, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 text-right">タップして明細を確認 →</p>
      </div>
    </Link>
  );
}
