// Server-side pending snapshot loader.
// Sources: credit-card/未確定決済情報_* files (legacy paste files in git)
//        + Supabase ff_pending_transactions (ingested via /ingest).
// Rows already present in confirmed card statements are filtered out (消し込み).

import {
  PendingTransaction,
  PendingSnapshot,
  parsePendingCardText,
  parseSnapshotDate,
} from '@/lib/pendingParse';
import { getCardStatements } from '@/lib/dataSource';
import { getSupabaseServer } from '@/lib/supabaseServer';

export type { PendingTransaction, PendingSnapshot };
export { parsePendingCardText, getPendingMonths } from '@/lib/pendingParse';

interface PendingRow {
  id: string;
  date: string;
  masked_card_number: string;
  card_last4: string;
  merchant: string;
  amount: number;
  payment_type: string;
  currency: string | null;
  foreign_amount: number | null;
  exchange_rate: number | null;
  last_seen: string | null;
}

async function loadSupabasePending(): Promise<{ transactions: PendingTransaction[]; latestSeen?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) return { transactions: [] };

  try {
    const { data, error } = await supabase.from('ff_pending_transactions').select('*');
    if (error || !data) return { transactions: [] };

    const rows = data as PendingRow[];
    const latestSeen = rows
      .map(r => r.last_seen)
      .filter((v): v is string => Boolean(v))
      .sort()
      .pop();

    return {
      latestSeen,
      transactions: rows.map(row => ({
        id: row.id,
        date: row.date,
        maskedCardNumber: row.masked_card_number,
        cardLast4: row.card_last4,
        merchant: row.merchant,
        amount: row.amount,
        paymentType: row.payment_type,
        currency: row.currency ?? undefined,
        foreignAmount: row.foreign_amount ?? undefined,
        exchangeRate: row.exchange_rate ?? undefined,
        sourceFile: 'supabase',
      })),
    };
  } catch {
    return { transactions: [] };
  }
}

export async function getLatestPendingSnapshot(): Promise<PendingSnapshot | null> {
  const { readdir, readFile } = await import('fs/promises');
  const path = await import('path');
  const creditCardDir = path.join(process.cwd(), 'credit-card');

  let candidates: string[] = [];
  try {
    const files = await readdir(creditCardDir);
    candidates = files
      .filter(fileName => fileName.startsWith('未確定決済情報_'))
      .sort((a, b) => b.localeCompare(a, 'ja'));
  } catch {
    // ファイルが読めない環境(将来のフルSupabase運用)でもSupabase分だけで動かす
  }

  // 確定済みの取引をロードしてフィルタリングに使用する(JSON + Supabase の両方)
  const confirmedSet = new Set<string>();
  try {
    const statements = await getCardStatements();
    for (const statement of statements) {
      for (const t of statement.transactions) {
        // 比較用のキー: "YYYY-MM-DD-店舗名-金額"
        // Note: 確定データは YYYY/MM/DD なので変換する
        const date = t.date.replace(/\//g, '-');
        confirmedSet.add(`${date}-${t.shop}-${t.amount}`);
      }
    }
  } catch (e) {
    console.error('Failed to load confirmed transactions:', e);
  }

  // 全ての未確定ソースを読み込み、IDで重複排除しながらマージする
  const allTransactionsMap = new Map<string, PendingTransaction>();

  const addTransactions = (transactions: PendingTransaction[]) => {
    for (const t of transactions) {
      if (confirmedSet.has(`${t.date}-${t.merchant}-${t.amount}`)) continue;
      if (!allTransactionsMap.has(t.id)) {
        allTransactionsMap.set(t.id, t);
      }
    }
  };

  for (const fileName of candidates) {
    const fullPath = path.join(creditCardDir, fileName);
    const content = await readFile(fullPath, 'utf8');
    const snapshot = parsePendingCardText(fileName, content);
    addTransactions(snapshot.transactions);
  }

  const supabasePending = await loadSupabasePending();
  addTransactions(supabasePending.transactions);

  if (allTransactionsMap.size === 0 && candidates.length === 0) {
    return null;
  }

  // スナップショット日付は「ファイルの最新」と「Supabaseの最新取込日」の新しい方
  const fileDate = candidates.length > 0 ? parseSnapshotDate(candidates[0]) : undefined;
  const snapshotDate = [fileDate, supabasePending.latestSeen]
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop();

  return {
    fileName: candidates[0] ?? 'supabase',
    snapshotDate,
    transactions: Array.from(allTransactionsMap.values()),
  };
}
