'use client';
import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '@/types';
import { CardStatement, CardTransaction } from '@/lib/cardUtils';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';
import { supabase } from '@/lib/supabase';

const INCOME = 250000;
const PERSON = 'natsuya';

const BILLING_MONTHS = [
  { yyyymm: '202512', label: '12月の収支', year: 2025, month: 12 },
  { yyyymm: '202601', label: '1月の収支',  year: 2026, month: 1  },
  { yyyymm: '202602', label: '2月の収支',  year: 2026, month: 2  },
  { yyyymm: '202603', label: '3月の収支',  year: 2026, month: 3  },
];

interface ListItem {
  id: string;
  line1: string;
  line2: string;
  amount: number;
}

interface DBComment {
  id: number;
  item_id: string;
  content: string;
}

interface Props {
  transactions: Transaction[];
  cardStatements: CardStatement[];
}

export default function NatsuyaDashboard({ transactions, cardStatements }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(3);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, DBComment[]>>({});
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sel = BILLING_MONTHS[selectedIndex];

  useEffect(() => {
    setLoading(true);
    setOpenCommentId(null);

    Promise.all([
      supabase
        .from('familybudget_exclusions')
        .select('item_id')
        .eq('person', PERSON)
        .eq('month', sel.yyyymm),
      supabase
        .from('familybudget_comments')
        .select('id, item_id, content')
        .eq('person', PERSON)
        .eq('month', sel.yyyymm)
        .order('created_at', { ascending: true }),
    ]).then(([excRes, comRes]) => {
      const excSet = new Set<string>((excRes.data ?? []).map((r: { item_id: string }) => r.item_id));
      setExcludedIds(excSet);

      const comMap: Record<string, DBComment[]> = {};
      for (const c of (comRes.data ?? []) as DBComment[]) {
        if (!comMap[c.item_id]) comMap[c.item_id] = [];
        comMap[c.item_id].push(c);
      }
      setComments(comMap);

      setLoading(false);
    });
  }, [sel.yyyymm]);

  const toggleExclude = async (id: string) => {
    const excluded = excludedIds.has(id);
    if (excluded) {
      await supabase
        .from('familybudget_exclusions')
        .delete()
        .eq('person', PERSON)
        .eq('month', sel.yyyymm)
        .eq('item_id', id);
      setExcludedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      await supabase
        .from('familybudget_exclusions')
        .insert({ person: PERSON, month: sel.yyyymm, item_id: id });
      setExcludedIds(prev => new Set(prev).add(id));
    }
  };

  const toggleCommentInput = (id: string) => {
    setOpenCommentId(prev => (prev === id ? null : id));
  };

  const addComment = async (id: string, text: string) => {
    if (!text.trim()) return;
    const { data } = await supabase
      .from('familybudget_comments')
      .insert({ person: PERSON, month: sel.yyyymm, item_id: id, content: text.trim() })
      .select('id, item_id, content')
      .single();
    if (data) {
      setComments(prev => ({
        ...prev,
        [id]: [...(prev[id] ?? []), data as DBComment],
      }));
    }
    setOpenCommentId(null);
  };

  // 銀行引き落とし（支出のみ）
  const bankItems: ListItem[] = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return (
          d.getFullYear() === sel.year &&
          d.getMonth() + 1 === sel.month &&
          t.type === 'expense'
        );
      })
      .map(t => ({
        id: `bank-${t.id}`,
        line1: t.note || t.description,
        line2: `${t.date} · ${t.account === 'mufg' ? '三菱UFJ' : 'りそな'}`,
        amount: t.amount,
      }));
  }, [transactions, sel.year, sel.month]);

  // VIEWカード（夏弥）利用明細
  const viewCardItems: ListItem[] = useMemo(() => {
    const stmt = cardStatements.find(s => s.payment_yyyymm === sel.yyyymm && s.card === 'view');
    if (!stmt) return [];
    return stmt.transactions
      .filter((t: CardTransaction) => t.person.includes('夏弥') && t.net > 0)
      .map((t: CardTransaction, i: number) => ({
        id: `view-natsuya-${sel.yyyymm}-${i}`,
        line1: t.shop,
        line2: `${t.date} · ${t.pay_type}`,
        amount: t.net,
      }));
  }, [cardStatements, sel.yyyymm]);

  // ルミネカード（夏弥）利用明細
  const lumineItems: ListItem[] = useMemo(() => {
    const stmt = cardStatements.find(s => s.payment_yyyymm === sel.yyyymm && s.card === 'lumine');
    if (!stmt) return [];
    return stmt.transactions
      .filter((t: CardTransaction) => t.net > 0)
      .map((t: CardTransaction, i: number) => ({
        id: `lumine-${sel.yyyymm}-${i}`,
        line1: t.shop,
        line2: `${t.date} · ${t.pay_type}`,
        amount: t.net,
      }));
  }, [cardStatements, sel.yyyymm]);

  const activeBankTotal = useMemo(
    () => bankItems.filter(t => !excludedIds.has(t.id)).reduce((s, t) => s + t.amount, 0),
    [bankItems, excludedIds]
  );
  const activeViewTotal = useMemo(
    () => viewCardItems.filter(t => !excludedIds.has(t.id)).reduce((s, t) => s + t.amount, 0),
    [viewCardItems, excludedIds]
  );
  const activeLumineTotal = useMemo(
    () => lumineItems.filter(t => !excludedIds.has(t.id)).reduce((s, t) => s + t.amount, 0),
    [lumineItems, excludedIds]
  );
  const excludedTotal = useMemo(
    () =>
      [...bankItems, ...viewCardItems, ...lumineItems]
        .filter(t => excludedIds.has(t.id))
        .reduce((s, t) => s + t.amount, 0),
    [bankItems, viewCardItems, lumineItems, excludedIds]
  );

  const grandTotal = activeBankTotal + activeViewTotal + activeLumineTotal;
  const isOver = grandTotal > INCOME;

  const sectionProps = {
    excludedIds,
    onToggle: toggleExclude,
    comments,
    openCommentId,
    onCommentToggle: toggleCommentInput,
    onCommentAdd: addComment,
    disabled: loading,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader isAlert={isOver} noPadBottom>
        <div className="flex items-center justify-between pt-1 pb-3">
          <div>
            <p className="text-white/60 text-xs">個人家計</p>
            <h1 className="text-white font-bold text-base leading-tight">松本夏弥</h1>
          </div>
          <HamburgerMenu />
        </div>
        <div className="flex gap-1 pb-3">
          {BILLING_MONTHS.map((m, i) => (
            <button
              key={m.yyyymm}
              onClick={() => setSelectedIndex(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                i === selectedIndex
                  ? 'bg-white text-slate-900'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto pb-10">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">読み込み中...</div>
        ) : (
          <>
            <TotalCard
              grandTotal={grandTotal}
              excludedTotal={excludedTotal}
              excludedCount={excludedIds.size}
              isOver={isOver}
            />
            <ItemSection
              title={`銀行引き落とし（${sel.month}月）`}
              activeTotal={activeBankTotal}
              items={bankItems}
              {...sectionProps}
            />
            <ItemSection
              title={`VIEWカード（夏弥）${sel.label}`}
              activeTotal={activeViewTotal}
              items={viewCardItems}
              {...sectionProps}
            />
            <ItemSection
              title={`ルミネカード（夏弥）${sel.label}`}
              activeTotal={activeLumineTotal}
              items={lumineItems}
              {...sectionProps}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── 合計カード ───────────────────────────────────────────────
function TotalCard({ grandTotal, excludedTotal, excludedCount, isOver }: {
  grandTotal: number; excludedTotal: number; excludedCount: number; isOver: boolean;
}) {
  const pct = Math.min((grandTotal / INCOME) * 100, 100);
  const diff = Math.abs(grandTotal - INCOME);
  return (
    <div className={`rounded-2xl p-4 border ${isOver ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">支出合計（除外分を除く）</p>
          <p className={`text-3xl font-bold tracking-tight ${isOver ? 'text-red-600' : 'text-slate-900'}`}>
            ¥{grandTotal.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">収入</p>
          <p className="text-lg font-bold text-slate-500">¥{INCOME.toLocaleString()}</p>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs font-semibold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
        {isOver ? `収入を ¥${diff.toLocaleString()} オーバー` : `収入まで残り ¥${diff.toLocaleString()}`}
      </p>
      {excludedCount > 0 && (
        <p className="text-xs text-slate-400 mt-2">
          ※ {excludedCount}件（¥{excludedTotal.toLocaleString()}）を除外中
        </p>
      )}
    </div>
  );
}

// ─── 項目セクション ───────────────────────────────────────────
interface ListItem {
  id: string;
  line1: string;
  line2: string;
  amount: number;
}

function ItemSection({ title, activeTotal, items, excludedIds, onToggle, comments, openCommentId, onCommentToggle, onCommentAdd, disabled }: {
  title: string;
  activeTotal: number;
  items: ListItem[];
  excludedIds: Set<string>;
  onToggle: (id: string) => void;
  comments: Record<string, DBComment[]>;
  openCommentId: string | null;
  onCommentToggle: (id: string) => void;
  onCommentAdd: (id: string, text: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(true);
  const excludedCount = items.filter(t => excludedIds.has(t.id)).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
      >
        <div className="text-left">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {excludedCount > 0 && (
            <span className="ml-2 text-xs text-slate-400">（{excludedCount}件除外）</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">¥{activeTotal.toLocaleString()}</span>
          <span className="text-slate-400 text-[10px]">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {items.length === 0 ? (
            <p className="text-slate-400 text-sm px-4 py-3">データなし</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map(t => {
                const excluded = excludedIds.has(t.id);
                const itemComments = comments[t.id] ?? [];
                const isCommentOpen = openCommentId === t.id;
                const hasComments = itemComments.length > 0;

                return (
                  <li key={t.id} className={`px-4 py-2.5 transition-opacity ${excluded ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium text-slate-800 leading-snug break-words ${excluded ? 'line-through' : ''}`}>
                          {t.line1}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{t.line2}</p>
                      </div>
                      <span className={`text-sm font-semibold whitespace-nowrap shrink-0 ${excluded ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        ¥{t.amount.toLocaleString()}
                      </span>
                      <button
                        onClick={() => onToggle(t.id)}
                        disabled={disabled}
                        className={`shrink-0 text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${
                          excluded
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600'
                        }`}
                      >
                        {excluded ? '戻す' : '除外'}
                      </button>
                      <button
                        onClick={() => onCommentToggle(t.id)}
                        disabled={disabled}
                        className={`shrink-0 p-1 rounded-lg transition-colors ${
                          isCommentOpen
                            ? 'text-blue-500 bg-blue-50'
                            : hasComments
                            ? 'text-blue-400 hover:bg-blue-50'
                            : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'
                        }`}
                        aria-label="コメントを追加"
                      >
                        <BubbleIcon filled={hasComments} />
                      </button>
                    </div>

                    {hasComments && (
                      <ul className="mt-1.5 space-y-0.5 pl-1">
                        {itemComments.map(c => (
                          <li key={c.id} className="flex items-start gap-1">
                            <span className="text-slate-300 text-[10px] mt-0.5 shrink-0">›</span>
                            <p className="text-xs text-slate-500 leading-relaxed break-words">{c.content}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {isCommentOpen && (
                      <CommentInput
                        onSubmit={text => onCommentAdd(t.id, text)}
                        onCancel={() => onCommentToggle(t.id)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── コメント入力フォーム ─────────────────────────────────────
function CommentInput({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  return (
    <div className="mt-2 flex gap-1.5 items-center">
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        placeholder="メモを追加..."
        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-300"
      />
      <button
        onClick={() => { if (text.trim()) onSubmit(text); }}
        disabled={!text.trim()}
        className="shrink-0 text-xs px-2.5 py-1.5 bg-slate-800 text-white rounded-lg disabled:opacity-30 font-semibold"
      >
        追加
      </button>
      <button onClick={onCancel} className="shrink-0 text-slate-400 text-xs px-1 py-1.5 hover:text-slate-600">
        ✕
      </button>
    </div>
  );
}

// ─── 吹き出しアイコン ─────────────────────────────────────────
function BubbleIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
