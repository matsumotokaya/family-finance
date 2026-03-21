'use client';
import { useState } from 'react';
import { CardStatement, CardTransaction } from '@/lib/cardUtils';

function fmtFull(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`;
}

function fmtDate(d: string) {
  const parts = d.split('/');
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

function monthLabel(yyyymm: string) {
  const m = parseInt(yyyymm.slice(4, 6));
  return `${m}月請求額`;
}

interface TxGroup {
  label: string;
  person: string;
  color: string;
  txns: CardTransaction[];
  subtotal: number;
}

export interface MonthBilling {
  yyyymm: string;
  viewMiku: number;
  viewNatsuya: number;
  lumine: number;
  total: number;
  groups: TxGroup[];
}

export function calcMonthBilling(statements: CardStatement[], yyyymm: string): MonthBilling {
  const viewStmt = statements.find(s => s.payment_yyyymm === yyyymm && s.card === 'view');
  const lumineStmt = statements.find(s => s.payment_yyyymm === yyyymm && s.card === 'lumine');

  const mikuTxns = viewStmt ? viewStmt.transactions.filter(t => t.person.includes('未来')) : [];
  const natsuyaTxns = viewStmt ? viewStmt.transactions.filter(t => t.person.includes('夏弥')) : [];
  const lumineTxns = lumineStmt ? lumineStmt.transactions : [];

  const sum = (txns: CardTransaction[]) => txns.filter(t => t.net > 0).reduce((s, t) => s + t.net, 0);

  const viewMiku = sum(mikuTxns);
  const viewNatsuya = sum(natsuyaTxns);
  const lumine = sum(lumineTxns);

  return {
    yyyymm,
    viewMiku,
    viewNatsuya,
    lumine,
    total: viewMiku + viewNatsuya + lumine,
    groups: [
      { label: 'VIEWカード',  person: '未来', color: '#f97316', txns: mikuTxns,   subtotal: viewMiku },
      { label: 'VIEWカード',  person: '夏弥', color: '#f97316', txns: natsuyaTxns, subtotal: viewNatsuya },
      { label: 'ルミネカード', person: '夏弥', color: '#475569', txns: lumineTxns,  subtotal: lumine },
    ],
  };
}

const ROWS = [
  { key: 'viewMiku'    as const, label: 'VIEWカード',  person: '未来', color: '#f97316' },
  { key: 'viewNatsuya' as const, label: 'VIEWカード',  person: '夏弥', color: '#f97316' },
  { key: 'lumine'      as const, label: 'ルミネカード', person: '夏弥', color: '#475569' },
];

function TxRows({ group }: { group: TxGroup }) {
  const sorted = [...group.txns].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="bg-slate-50 border-t border-slate-100">
      <div className="px-4 py-2 flex items-center gap-2 border-b border-slate-100">
        <span className="text-xs font-bold" style={{ color: group.color }}>{group.label}</span>
        <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">{group.person}</span>
        <span className="ml-auto text-xs font-bold text-slate-600">{fmtFull(group.subtotal)}</span>
      </div>
      {sorted.map((t, i) => (
        <div key={i} className="flex items-center px-4 py-2 border-b border-slate-100 gap-3">
          <span className="text-xs text-slate-400 w-8 flex-shrink-0">{fmtDate(t.date)}</span>
          <p className="flex-1 text-xs text-slate-700 truncate">{t.shop}</p>
          <span className={`text-xs font-bold flex-shrink-0 ${t.net < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
            {t.net < 0 ? `−${fmtFull(Math.abs(t.net))}` : fmtFull(t.net)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MonthBillingCard({ billing, expandable = false }: { billing: MonthBilling; expandable?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-bold text-slate-700">{monthLabel(billing.yyyymm)}</h2>
        <p className="text-xs text-slate-400 mt-0.5">VIEWカード ※ 他カードは集計対象外</p>
      </div>

      <div className="divide-y divide-slate-50 px-4">
        {ROWS.map(row => (
          <div key={row.key} className="flex items-center justify-between py-3">
            <div>
              <span className="text-sm font-bold text-slate-700">{row.label}</span>
              <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{row.person}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: billing[row.key] > 0 ? row.color : '#94a3b8' }}>
              {fmtFull(billing[row.key])}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 mx-4" />
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
        <span className="text-sm font-bold text-slate-600">合計</span>
        <span className="text-2xl font-black text-slate-900">{fmtFull(billing.total)}</span>
      </div>

      {expandable && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full border-t border-slate-100 px-4 py-3 flex items-center justify-between active:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-bold text-slate-500">明細を見る</span>
            <span className="text-slate-400 text-xs">{open ? '▲ 閉じる' : '▼ 開く'}</span>
          </button>
          {open && billing.groups.map((g, i) => <TxRows key={i} group={g} />)}
        </>
      )}
    </div>
  );
}
