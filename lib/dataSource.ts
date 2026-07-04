// Merged data access layer.
// JSON files in git = archived/confirmed history (updated by scripts),
// Supabase ff_* tables = data ingested via /ingest.
// Every reader falls back to JSON-only when Supabase is unavailable.

import transactionsData from '@/data/transactions.json';
import cardData from '@/data/card_transactions.json';
import { Transaction } from '@/types';
import { CardStatement, CardTransaction } from '@/lib/cardUtils';
import { getSupabaseServer } from '@/lib/supabaseServer';

interface BankRow {
  id: string;
  date: string;
  account: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  note: string | null;
  balance_after: number | null;
}

export async function getBankTransactions(): Promise<Transaction[]> {
  const jsonTransactions = transactionsData.transactions as Transaction[];
  const supabase = getSupabaseServer();
  if (!supabase) return jsonTransactions;

  try {
    const { data, error } = await supabase
      .from('ff_bank_transactions')
      .select('id, date, account, type, amount, description, category, note, balance_after');
    if (error || !data) return jsonTransactions;

    const known = new Set(jsonTransactions.map(t => t.id));
    const extra: Transaction[] = (data as BankRow[])
      .filter(row => !known.has(row.id))
      .map(row => ({
        id: row.id,
        date: row.date,
        account: row.account as Transaction['account'],
        type: row.type as Transaction['type'],
        amount: row.amount,
        description: row.description,
        category: row.category as Transaction['category'],
        note: row.note ?? undefined,
        balance_after: row.balance_after ?? undefined,
      }));

    return [...jsonTransactions, ...extra].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return jsonTransactions;
  }
}

interface StatementRow {
  id: string;
  file: string;
  card: string;
  card_label: string;
  payment_date: string;
  payment_yyyymm: string;
  total: number;
  ff_card_transactions: Array<{
    date: string;
    shop: string;
    amount: number;
    refund: number;
    this_charge: number;
    net: number;
    pay_type: string;
    person: string;
  }>;
}

export async function getCardStatements(): Promise<CardStatement[]> {
  const jsonStatements = cardData.statements as CardStatement[];
  const supabase = getSupabaseServer();
  if (!supabase) return jsonStatements;

  try {
    const { data, error } = await supabase
      .from('ff_card_statements')
      .select('id, file, card, card_label, payment_date, payment_yyyymm, total, ff_card_transactions(*)');
    if (error || !data) return jsonStatements;

    const knownFiles = new Set(jsonStatements.map(s => s.file));
    const extra: CardStatement[] = (data as unknown as StatementRow[])
      .filter(row => !knownFiles.has(row.file))
      .map(row => ({
        file: row.file,
        card: row.card as CardStatement['card'],
        card_label: row.card_label,
        payment_date: row.payment_date,
        payment_yyyymm: row.payment_yyyymm,
        total: row.total,
        transactions: row.ff_card_transactions.map((t): CardTransaction => ({
          date: t.date,
          shop: t.shop,
          amount: t.amount,
          refund: t.refund,
          this_charge: t.this_charge,
          net: t.net,
          pay_type: t.pay_type,
          person: t.person,
        })),
      }))
      .sort((a, b) => b.payment_yyyymm.localeCompare(a.payment_yyyymm));

    return [...extra, ...jsonStatements];
  } catch {
    return jsonStatements;
  }
}
