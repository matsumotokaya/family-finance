export interface PendingTransaction {
  id: string;
  date: string;
  maskedCardNumber: string;
  cardLast4: string;
  merchant: string;
  amount: number;
  paymentType: string;
  currency?: string;
  foreignAmount?: number;
  exchangeRate?: number;
  sourceFile: string;
}

export interface PendingSnapshot {
  fileName: string;
  snapshotDate?: string;
  transactions: PendingTransaction[];
}

export function getPendingMonths(transactions: PendingTransaction[]): string[] {
  return Array.from(new Set(transactions.map(transaction => transaction.date.slice(0, 7).replace('-', ''))))
    .sort((a, b) => b.localeCompare(a));
}

function parseAmount(value: string): number {
  const normalized = value.replace(/[(),]/g, '').trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parseSnapshotDate(fileName: string): string | undefined {
  const match = fileName.match(/_(\d{8})$/);
  if (!match) return undefined;

  const [, rawDate] = match;
  return `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
}

export function parsePendingCardText(fileName: string, rawText: string): PendingSnapshot {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const transactions: PendingTransaction[] = [];
  let currentYear = '';
  // ファイル名・行番号に依存しないID生成のため、同一キーの出現回数を追跡する
  const occurrenceCount: Record<string, number> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\d{4}$/.test(line)) {
      currentYear = line;
      continue;
    }

    if (!/^\d{2}\/\d{2}\t/.test(line) || !currentYear) {
      continue;
    }

    const mainParts = line.split('\t').map(part => part.trim());
    const detailLine = lines[index + 1] ?? '';
    const detailParts = detailLine.split('\t').map(part => part.trim());

    const [monthDay, maskedCardNumber = '', merchant = '', amountText = '0'] = mainParts;
    const [month, day] = monthDay.split('/');
    const amount = parseAmount(amountText);
    const paymentType = detailParts[4] || '';
    const currency = detailParts[2] || undefined;
    const foreignAmount = detailParts[1] ? parseAmount(detailParts[1]) : undefined;
    const exchangeRate = detailParts[3] ? Number(detailParts[3].replace(/,/g, '')) : undefined;
    const cardLast4Match = maskedCardNumber.match(/(\d{4})$/);
    const cardLast4 = cardLast4Match?.[1] ?? '----';

    // IDは取引内容のみで生成（ファイル名・行番号を含まない）
    // 同日・同カード・同店舗・同金額が複数ある場合は出現順で区別する
    const baseKey = `${currentYear}-${month}-${day}-${cardLast4}-${merchant}-${amount}`;
    const occurrence = occurrenceCount[baseKey] ?? 0;
    occurrenceCount[baseKey] = occurrence + 1;

    transactions.push({
      id: `${baseKey}-${occurrence}`,
      date: `${currentYear}-${month}-${day}`,
      maskedCardNumber,
      cardLast4,
      merchant,
      amount,
      paymentType,
      currency,
      foreignAmount,
      exchangeRate: Number.isFinite(exchangeRate) ? exchangeRate : undefined,
      sourceFile: fileName,
    });

    if (detailLine.startsWith('(')) {
      index += 1;
    }
  }

  return {
    fileName,
    snapshotDate: parseSnapshotDate(fileName),
    transactions,
  };
}

export async function getLatestPendingSnapshot(): Promise<PendingSnapshot | null> {
  const { readdir, readFile } = await import('fs/promises');
  const path = await import('path');
  const creditCardDir = path.join(process.cwd(), 'credit-card');
  const files = await readdir(creditCardDir);
  const candidates = files
    .filter(fileName => fileName.startsWith('未確定決済情報_'))
    .sort((a, b) => b.localeCompare(a, 'ja'));

  if (candidates.length === 0) return null;

  // 確定済みの取引をロードしてフィルタリングに使用する
  const confirmedDataPath = path.join(process.cwd(), 'data', 'card_transactions.json');
  let confirmedSet = new Set<string>();
  try {
    const confirmedData = JSON.parse(await readFile(confirmedDataPath, 'utf8'));
    for (const statement of confirmedData.statements) {
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

  // 全ての未確定ファイルを読み込み、IDで重複排除しながらマージする
  const allTransactionsMap = new Map<string, PendingTransaction>();
  for (const fileName of candidates) {
    const fullPath = path.join(creditCardDir, fileName);
    const content = await readFile(fullPath, 'utf8');
    const snapshot = parsePendingCardText(fileName, content);
    
    for (const t of snapshot.transactions) {
      // 確定済みでないものだけを追加
      if (!confirmedSet.has(`${t.date}-${t.merchant}-${t.amount}`)) {
        // 同一ID（日付・カード・店舗・金額・出現順）があれば上書き（新しいファイルの方が情報が詳しい可能性があるため）
        if (!allTransactionsMap.has(t.id)) {
          allTransactionsMap.set(t.id, t);
        }
      }
    }
  }

  const mergedTransactions = Array.from(allTransactionsMap.values());
  const latestFile = candidates[0];

  return {
    fileName: latestFile,
    snapshotDate: parseSnapshotDate(latestFile),
    transactions: mergedTransactions,
  };
}
