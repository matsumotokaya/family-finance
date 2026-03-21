import { Transaction } from '@/types';

export interface BalancePoint {
  date: string;       // YYYY-MM-DD
  label: string;      // "12/1" 表示用
  mufg: number | null;
  resona: number | null;
  total: number | null;
  event?: string;     // 取引の説明（ツールチップ用）
}

// Initial balances (day before first transaction, from screenshots)
const INITIAL = {
  mufg:   1984267,   // 2025-11-30 time point
  resona:  370333,   // 2025-11-30 time point
};

function toLabel(date: string): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function buildBalanceSeries(transactions: Transaction[]): BalancePoint[] {
  // Filter to MUFG and Resona with balance_after only
  const relevant = transactions
    .filter(t => (t.account === 'mufg' || t.account === 'resona') && t.balance_after != null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  if (relevant.length === 0) return [];

  // Track last known balance per account
  let mufg = INITIAL.mufg;
  let resona = INITIAL.resona;

  // Start point
  const points: BalancePoint[] = [
    {
      date: '2025-11-30',
      label: '11/30',
      mufg,
      resona,
      total: mufg + resona,
    },
  ];

  // Group by date (take last balance of each account per date)
  const byDate = new Map<string, { mufg?: number; resona?: number; events: string[] }>();

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

  for (const [date, data] of Array.from(byDate.entries()).sort()) {
    if (data.mufg != null) mufg = data.mufg;
    if (data.resona != null) resona = data.resona;
    points.push({
      date,
      label: toLabel(date),
      mufg,
      resona,
      total: mufg + resona,
      event: data.events.join(' / ') || undefined,
    });
  }

  return points;
}
