'use client';
import { useState, useMemo } from 'react';
import { CardStatement, CardTransaction } from '@/lib/cardUtils';

type Tab = 'view-miku' | 'view-natsuya' | 'lumine';

const TABS: { id: Tab; label: string }[] = [
  { id: 'view-miku',     label: 'VIEWカード（未来）' },
  { id: 'view-natsuya',  label: 'VIEWカード（夏弥）' },
  { id: 'lumine',        label: 'ルミネカード（夏弥）' },
];

function fmtFull(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`;
}

function fmtDate(d: string) {
  const parts = d.split('/');
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

function TransactionRows({ txns }: { txns: CardTransaction[] }) {
  const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      {sorted.map((t, i) => (
        <div key={i} className="flex items-center px-4 py-2.5 border-b border-slate-50 gap-3">
          <span className="text-xs text-slate-400 w-8 flex-shrink-0">{fmtDate(t.date)}</span>
          <p className="flex-1 text-sm text-slate-800 truncate">{t.shop}</p>
          <div className="text-right flex-shrink-0">
            <p className={`text-sm font-bold ${t.net < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
              {t.net < 0 ? `−${fmtFull(Math.abs(t.net))}` : fmtFull(t.net)}
            </p>
            {t.pay_type !== '１回払' && (
              <p className="text-xs text-slate-400">{t.pay_type}</p>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export default function CardDetailTabs({ statements, yyyymm }: { statements: CardStatement[]; yyyymm: string }) {
  const [tab, setTab] = useState<Tab>('view-miku');

  const { txns, total } = useMemo(() => {
    const cardType = tab === 'lumine' ? 'lumine' : 'view';
    const stmt = statements.find(s => s.payment_yyyymm === yyyymm && s.card === cardType);
    if (!stmt) return { txns: [], total: 0 };

    let filtered = stmt.transactions;
    if (tab === 'view-miku') {
      filtered = filtered.filter(t => t.person.includes('未来'));
    } else if (tab === 'view-natsuya') {
      filtered = filtered.filter(t => t.person.includes('夏弥'));
    }

    const total = filtered.filter(t => t.net > 0).reduce((s, t) => s + t.net, 0);
    return { txns: filtered, total };
  }, [statements, yyyymm, tab]);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-bold transition-colors leading-tight px-1 ${
              tab === t.id
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {txns.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">データがありません</p>
        ) : (
          <TransactionRows txns={txns} />
        )}
      </div>

      {/* Footer total */}
      <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50">
        <span className="text-xs text-slate-500">合計</span>
        <span className="text-base font-black text-slate-900">{fmtFull(total)}</span>
      </div>
    </div>
  );
}
