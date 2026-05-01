import { Transaction, MonthlyStats, CategoryItem, TransactionCategory } from '@/types';

export function getAvailableMonths(transactions: Transaction[]): { year: number; month: number }[] {
  const set = new Set<string>();
  transactions.forEach(t => {
    const d = new Date(t.date);
    set.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  });

  // Always include the current month (JST)
  const now = new Date();
  // Adjust to JST (UTC+9) if needed, but since this runs on the user's machine/Vercel, 
  // Date() usually reflects the system time.
  set.add(`${now.getFullYear()}-${now.getMonth() + 1}`);

  return Array.from(set)
    .map(s => {
      const [y, m] = s.split('-').map(Number);
      return { year: y, month: m };
    })
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}

export function getMonthlyStats(
  transactions: Transaction[],
  year: number,
  month: number,
  incompleteMonths: string[],
  standardMonthlyIncome: number = 500000
): MonthlyStats {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const monthTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  const relevant = monthTxs.filter(t => t.category !== 'internal_transfer');
  const totalIncome = relevant.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = relevant.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return {
    year, month,
    totalIncome, totalExpense,
    netBalance: totalIncome - totalExpense,
    projectedNetBalance: standardMonthlyIncome - totalExpense,
    transactions: monthTxs,
    isIncomplete: incompleteMonths.includes(key),
  };
}

export function getAllMonthlyStats(
  transactions: Transaction[],
  incompleteMonths: string[],
  standardMonthlyIncome: number = 500000
): MonthlyStats[] {
  return getAvailableMonths(transactions).map(({ year, month }) =>
    getMonthlyStats(transactions, year, month, incompleteMonths, standardMonthlyIncome)
  );
}

export function getCategoryBreakdown(transactions: Transaction[]): CategoryItem[] {
  const map: Partial<Record<TransactionCategory, number>> = {};
  transactions
    .filter(t => t.type === 'expense' && t.category !== 'internal_transfer')
    .forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
  return Object.entries(map)
    .map(([cat, amount]) => ({
      category: cat as TransactionCategory,
      label: CATEGORY_LABELS[cat as TransactionCategory] || cat,
      amount: amount as number,
      color: CATEGORY_COLORS[cat as TransactionCategory] || '#9ca3af',
    }))
    .sort((a, b) => b.amount - a.amount);
}

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  salary: '給与',
  child_allowance: '児童手当',
  subsidy: '補助・支援金',
  interest: '利息',
  housing_loan: '住宅ローン',
  card_payment: 'クレカ引き落とし',
  utilities: '公共料金・給食費',
  insurance: '保険料',
  cash_withdrawal: '現金引き出し',
  internal_transfer: '口座間移動',
  other_income: 'その他収入',
  other_expense: 'その他支出',
};

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  salary: '#22c55e',
  child_allowance: '#3b82f6',
  subsidy: '#14b8a6',
  interest: '#a3e635',
  housing_loan: '#ef4444',
  card_payment: '#f97316',
  utilities: '#8b5cf6',
  insurance: '#06b6d4',
  cash_withdrawal: '#eab308',
  internal_transfer: '#9ca3af',
  other_income: '#84cc16',
  other_expense: '#6b7280',
};

export const ACCOUNT_LABELS: Record<string, string> = {
  mufg: '三菱UFJ',
  resona: 'りそな',
  yucho_daughter: 'ゆうちょ（娘）',
  yucho_son: 'ゆうちょ（息子）',
};

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export function getMonthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}

export function monthsUntil(targetYear: number, targetMonth: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
}
