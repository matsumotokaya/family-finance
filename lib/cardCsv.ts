// Parser for confirmed card statement CSVs downloaded from VIEW's NET.
// TypeScript port of scripts/import-card-csv.mjs (kept in sync manually).
// Pure functions: safe for both server routes and client-side preview.

import { CardStatement, CardTransaction } from '@/lib/cardUtils';

function parseAmount(value: string | undefined): number {
  if (!value) return 0;
  return Number(value.replace(/["\s,]/g, '')) || 0;
}

function splitCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current);
  return parts;
}

function normalizePaymentYYYYMM(paymentDate: string): string {
  return paymentDate
    .replace('年', '')
    .replace('月', '')
    .replace('日', '')
    .replace(/\s/g, '')
    .slice(0, 6);
}

function normalizeShop(value: string): string {
  return value.replace(/－/g, '−');
}

function isMalformedTrailingLine(parts: string[]): boolean {
  return /^\d{4}\/\d{2}\/\d{2}$/.test(parts[3] ?? '');
}

function detectCardMeta(lines: string[], fileName: string) {
  const targetCardLine = lines.find(line => line.startsWith('対象カード,')) ?? '';
  const targetCard = targetCardLine.split(',')[1]?.trim() ?? '';
  const isLumine = targetCard.includes('ルミネ');

  return {
    file: fileName,
    card: (isLumine ? 'lumine' : 'view') as CardStatement['card'],
    card_label: isLumine ? 'ルミネカード（夏弥）' : 'ViewCard（未来）',
  };
}

export function parseCardStatementCsv(content: string, fileName: string): CardStatement {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const meta = detectCardMeta(lines, fileName);

  let paymentDate = '';
  let total = 0;
  let currentPerson = '';
  let dataStarted = false;
  const transactions: CardTransaction[] = [];

  for (const line of lines) {
    if (line.startsWith('お支払日,')) {
      paymentDate = splitCSVLine(line)[1]?.trim() ?? '';
      continue;
    }

    if (line.startsWith('今回お支払金額,')) {
      total = parseAmount(splitCSVLine(line)[1]);
    }
  }

  for (const line of lines) {
    if (line.includes('****-****-****-')) {
      const match = line.match(/\*\*\*\*-\*\*\*\*-\*\*\*\*-\d{4}\s+(.+)$/);
      if (match) currentPerson = match[1].trim();
      dataStarted = true;
      continue;
    }

    const parts = splitCSVLine(line);
    if (!dataStarted || !/^\d{4}\/\d{2}\/\d{2}$/.test(parts[0] ?? '')) {
      continue;
    }

    if (isMalformedTrailingLine(parts)) {
      continue;
    }

    const amount = parseAmount(parts[2]);
    const refund = parseAmount(parts[3]);
    const thisCharge = parseAmount(parts[7]);
    const net = thisCharge === 0 && amount < 0 ? amount : thisCharge;

    transactions.push({
      date: parts[0],
      shop: normalizeShop((parts[1] ?? '').trim()),
      amount,
      refund,
      this_charge: thisCharge,
      net,
      pay_type: (parts[5] ?? '').trim(),
      person: currentPerson,
    });
  }

  return {
    ...meta,
    payment_date: paymentDate,
    payment_yyyymm: normalizePaymentYYYYMM(paymentDate),
    total,
    transactions,
  };
}
