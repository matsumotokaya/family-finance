'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';
import { PendingSnapshot, PendingTransaction } from '@/lib/pendingCardUtils';
import { getMonthLabel, VIEW_CARD_MIKU_LIMIT } from '@/lib/cardUtils';
import { supabase } from '@/lib/supabase';
import { BubbleIcon, CommentInput, CommentList } from './CommentUI';

const PERSON = 'mirai_pending';

// This page manages only the VIEW card (Mirai, last-4 = 0406).
//
// EXCEPTION: the pasted "未確定決済情報" sometimes mixes in a different card
// (last-4 = 1205: ETC / overseas charges, etc.). 1205 belongs to a separate
// card that should have its own page. As a temporary measure, on this page we:
//   - drop 1205 from the detail list (not shown, not counted in totals)
//   - keep it visible in the per-card summary, greyed out and labelled "(除外済み)"
// Future: split the pending page per card. See README「未確定決済情報ページ」.
const PENDING_TARGET_CARD_LAST4 = '0406';

interface DBComment {
  id: number;
  item_id: string;
  content: string;
}

interface ListItem {
  id: string;
  line1: string;
  line2: string;
  amount: number;
  raw: PendingTransaction;
}

interface Props {
  snapshot: PendingSnapshot;
  selectedMonth: string;
  availableMonths: string[];
}

function formatAmount(amount: number) {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${year}/${month}/${day}`;
}

function formatSnapshotDate(date?: string) {
  if (!date) return '日付不明';
  const [year, month, day] = date.split('-');
  return `${year}/${month}/${day}`;
}

function summarizeByCard(transactions: PendingTransaction[]) {
  const summaryMap = transactions.reduce((map, transaction) => {
    const current = map.get(transaction.cardLast4) ?? { cardLast4: transaction.cardLast4, count: 0, amount: 0 };
    current.count += 1;
    current.amount += transaction.amount;
    map.set(transaction.cardLast4, current);
    return map;
  }, new Map<string, { cardLast4: string; count: number; amount: number }>());

  return Array.from(summaryMap.values()).sort((a, b) => b.amount - a.amount);
}

export default function PendingDashboard({ snapshot, selectedMonth, availableMonths }: Props) {
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, DBComment[]>>({});
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [noCommentWarningId, setNoCommentWarningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setOpenCommentId(null);

    Promise.all([
      supabase
        .from('familybudget_exclusions')
        .select('item_id')
        .eq('person', PERSON)
        .eq('month', selectedMonth),
      supabase
        .from('familybudget_comments')
        .select('id, item_id, content')
        .eq('person', PERSON)
        .eq('month', selectedMonth)
        .order('created_at', { ascending: true }),
    ]).then(([excRes, comRes]) => {
      const excSet = new Set<string>((excRes.data ?? []).map((row: { item_id: string }) => row.item_id));
      setExcludedIds(excSet);

      const commentMap: Record<string, DBComment[]> = {};
      for (const comment of (comRes.data ?? []) as DBComment[]) {
        if (!commentMap[comment.item_id]) commentMap[comment.item_id] = [];
        commentMap[comment.item_id].push(comment);
      }
      setComments(commentMap);
      setLoading(false);
    });
  }, [selectedMonth]);

  // 当月の全未確定明細（対象カード + 除外カード両方）
  const monthTransactions = useMemo(
    () =>
      snapshot.transactions
        .filter(transaction => transaction.date.slice(0, 7).replace('-', '') === selectedMonth)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [selectedMonth, snapshot.transactions]
  );

  // 明細本体は対象カード（0406）のみ。1205 など別カードはここで除外される。
  const items = useMemo<ListItem[]>(() => {
    return monthTransactions
      .filter(transaction => transaction.cardLast4 === PENDING_TARGET_CARD_LAST4)
      .map(transaction => ({
        id: transaction.id,
        line1: transaction.merchant,
        line2: [
          formatDate(transaction.date),
          `下4桁 ${transaction.cardLast4}`,
          transaction.paymentType || '支払区分不明',
          transaction.currency && transaction.foreignAmount
            ? `${transaction.foreignAmount.toLocaleString('ja-JP')} ${transaction.currency}`
            : null,
        ].filter(Boolean).join(' / '),
        amount: transaction.amount,
        raw: transaction,
      }));
  }, [monthTransactions]);

  const activeItems = useMemo(
    () => items.filter(item => !excludedIds.has(item.id)),
    [items, excludedIds]
  );
  const totalAmount = activeItems.reduce((sum, item) => sum + item.amount, 0);
  const excludedTotal = items
    .filter(item => excludedIds.has(item.id))
    .reduce((sum, item) => sum + item.amount, 0);
  const excludedCount = items.filter(item => excludedIds.has(item.id)).length;
  // 対象カードの集計（手動除外を反映）。従来どおり。
  const cardSummaries = summarizeByCard(activeItems.map(item => item.raw));
  // 別カード（1205 など）はグレーアウト表示のみ。合計・予算には一切含めない。
  const excludedCardSummaries = summarizeByCard(
    monthTransactions.filter(transaction => transaction.cardLast4 !== PENDING_TARGET_CARD_LAST4)
  );
  const nextMonthBudget = VIEW_CARD_MIKU_LIMIT - totalAmount;
  const isNextMonthBudgetNegative = nextMonthBudget < 0;

  const toggleExclude = async (id: string) => {
    const excluded = excludedIds.has(id);
    if (excluded) {
      await supabase
        .from('familybudget_exclusions')
        .delete()
        .eq('person', PERSON)
        .eq('month', selectedMonth)
        .eq('item_id', id);
      setExcludedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    if (!comments[id] || comments[id].length === 0) {
      setNoCommentWarningId(id);
      setOpenCommentId(id);
      return;
    }

    setNoCommentWarningId(null);
    await supabase
      .from('familybudget_exclusions')
      .insert({ person: PERSON, month: selectedMonth, item_id: id });
    setExcludedIds(prev => new Set(prev).add(id));
  };

  const toggleCommentInput = (id: string) => {
    setOpenCommentId(prev => (prev === id ? null : id));
  };

  const addComment = async (id: string, text: string) => {
    if (!text.trim()) return;
    const { data } = await supabase
      .from('familybudget_comments')
      .insert({ person: PERSON, month: selectedMonth, item_id: id, content: text.trim() })
      .select('id, item_id, content')
      .single();

    if (data) {
      setComments(prev => ({
        ...prev,
        [id]: [...(prev[id] ?? []), data as DBComment],
      }));
      if (noCommentWarningId === id) {
        setNoCommentWarningId(null);
      }
    }
    setOpenCommentId(null);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <PageHeader>
        <div className="flex items-center justify-between pt-1 pb-3">
          <div>
            <p className="text-xs text-white/60">ビューカード速報</p>
            <h1 className="text-lg font-bold text-balance">未確定決済情報</h1>
            <p className="mt-0.5 text-xs text-white/60">
              {formatSnapshotDate(snapshot.snapshotDate)} 時点 / {snapshot.fileName}
            </p>
          </div>
          <HamburgerMenu />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-3">
          {availableMonths.map(month => (
            <Link
              key={month}
              href={`/pending/${month}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                month === selectedMonth
                  ? 'bg-white text-slate-900'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {getMonthLabel(month)}
            </Link>
          ))}
        </div>
      </PageHeader>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-12">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{getMonthLabel(selectedMonth)} 合計</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatAmount(totalAmount)}</p>
            {excludedCount > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {excludedCount}件（¥{excludedTotal.toLocaleString()}）を除外中
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">件数</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{activeItems.length}件</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">カード下4桁ごとの集計</h2>
            <span className="text-xs text-slate-500">判別用</span>
          </div>
          <div className="mt-3 space-y-2">
            {cardSummaries.map(summary => (
              <div key={summary.cardLast4} className="rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">カード下4桁</p>
                    <p className="text-base font-bold tabular-nums text-slate-900">{summary.cardLast4}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{summary.count}件</p>
                    <p className="text-base font-bold tabular-nums text-slate-900">{formatAmount(summary.amount)}</p>
                  </div>
                </div>
              </div>
            ))}
            {/* 別カード（1205 など）: グレーアウト＋（除外済み）。合計には含まない */}
            {excludedCardSummaries.map(summary => (
              <div key={summary.cardLast4} className="rounded-xl bg-slate-100 px-3 py-3 opacity-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">カード下4桁</p>
                    <p className="text-base font-bold tabular-nums text-slate-500">
                      {summary.cardLast4}
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 align-middle">
                        除外済み（別カード）
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{summary.count}件</p>
                    <p className="text-base font-bold tabular-nums text-slate-400 line-through">{formatAmount(summary.amount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`rounded-2xl border p-4 shadow-sm ${isNextMonthBudgetNegative ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">来月の予算</h2>
              <p className="mt-1 text-xs text-slate-600">
                基準予算 ¥{VIEW_CARD_MIKU_LIMIT.toLocaleString()} から、今回の対象額を差し引いています。
              </p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${isNextMonthBudgetNegative ? 'text-red-600' : 'text-emerald-700'}`}>
              ¥{nextMonthBudget.toLocaleString()}
            </p>
          </div>
          <div className="mt-3 rounded-xl bg-white/80 px-3 py-3">
            <p className="text-sm font-semibold tabular-nums text-slate-800">
              ¥{VIEW_CARD_MIKU_LIMIT.toLocaleString()} - ¥{totalAmount.toLocaleString()} = ¥{nextMonthBudget.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              除外した明細は差し引きに含めていません。
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">{getMonthLabel(selectedMonth)} の未確定明細</h2>
            <p className="mt-1 text-xs text-slate-500 text-pretty">
              対象カード（下4桁 {PENDING_TARGET_CARD_LAST4}）の未確定決済を日付順に表示しています。別カードは除外中です。
            </p>
          </div>
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">読み込み中...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">データなし</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map(item => {
                const excluded = excludedIds.has(item.id);
                const itemComments = comments[item.id] ?? [];
                const isCommentOpen = openCommentId === item.id;
                const hasComments = itemComments.length > 0;

                const showNoCommentWarning = noCommentWarningId === item.id;

                return (
                  <li key={item.id} className={`px-4 py-3 transition-opacity ${excluded ? 'opacity-40' : ''}`}>
                    {showNoCommentWarning && (
                      <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        除外するにはコメント欄に理由を記入してください
                      </p>
                    )}
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800">
                            {item.raw.cardLast4}
                          </span>
                          <span className="text-xs tabular-nums text-slate-500">{formatDate(item.raw.date)}</span>
                        </div>
                        <p className={`mt-1 text-sm font-semibold text-slate-900 text-pretty ${excluded ? 'line-through' : ''}`}>
                          {item.line1}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 text-pretty">{item.line2}</p>
                        {item.raw.currency && item.raw.exchangeRate && (
                          <p className="mt-1 text-xs text-slate-400 tabular-nums">
                            レート {item.raw.exchangeRate.toLocaleString('ja-JP')}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className={`text-base font-bold tabular-nums ${excluded ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {formatAmount(item.amount)}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleExclude(item.id)}
                            disabled={loading}
                            className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                              excluded
                                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                : 'bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600'
                            }`}
                          >
                            {excluded ? '戻す' : '除外'}
                          </button>
                          <button
                            onClick={() => toggleCommentInput(item.id)}
                            disabled={loading}
                            className={`rounded-lg p-1 transition-colors ${
                              isCommentOpen
                                ? 'bg-blue-50 text-blue-500'
                                : hasComments
                                ? 'text-blue-400 hover:bg-blue-50'
                                : 'text-slate-300 hover:bg-slate-100 hover:text-slate-400'
                            }`}
                            aria-label="コメントを追加"
                          >
                            <BubbleIcon filled={hasComments} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <CommentList comments={itemComments} />

                    {isCommentOpen && (
                      <CommentInput
                        onSubmit={text => addComment(item.id, text)}
                        onCancel={() => toggleCommentInput(item.id)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
