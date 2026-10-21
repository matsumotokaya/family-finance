import { Transaction } from '@/types';

export interface BalancePoint {
  date: string;       // YYYY-MM-DD
  label: string;      // "2025/12/1" for display
  mufg: number | null;
  resona: number | null;
  total: number | null; // only when both balances are known
  event?: string;     // 取引の説明（ツールチップ用）
}

// Resona statements lack balances for some periods, so start from a balance confirmed on a screenshot
const RESONA_ANCHOR = { date: '2025-11-30', balance: 370333 };

function toLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}/${m}/${d}`;
}

export function buildBalanceSeries(transactions: Transaction[]): BalancePoint[] {
  // Filter to MUFG and Resona with balance_after only
  const relevant = transactions
    .filter(t => (t.account === 'mufg' || t.account === 'resona') && t.balance_after != null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id, undefined, { numeric: true }));

  if (relevant.length === 0) return [];

  // Group by date (take last balance of each account per date)
  const byDate = new Map<string, { mufg?: number; resona?: number; events: string[] }>();
  byDate.set(RESONA_ANCHOR.date, { resona: RESONA_ANCHOR.balance, events: [] });

  for (const t of relevant) {
    const entry = byDate.get(t.date) || { events: [] };
    if (t.account === 'mufg') entry.mufg = t.balance_after!;
    if (t.account === 'resona') entry.resona = t.balance_after!;
    // Collect notable events
    if (t.category === 'salary' || t.category === 'child_allowance' || t.category === 'subsidy') {
      entry.events.push(`+${t.description}`);
    } else if (t.category === 'card_payment' || t.category === 'housing_loan') {
      entry.events.push(`-${t.description}`);
    }
    byDate.set(t.date, entry);
  }

  // Each account's line starts at its first known balance
  let mufg: number | null = null;
  let resona: number | null = null;
  const points: BalancePoint[] = [];

  for (const [date, data] of Array.from(byDate.entries()).sort()) {
    if (data.mufg != null) mufg = data.mufg;
    if (data.resona != null) resona = data.resona;
    points.push({
      date,
      label: toLabel(date),
      mufg,
      resona,
      total: mufg != null && resona != null ? mufg + resona : null,
      event: data.events.join(' / ') || undefined,
    });
  }

  return points;
}
