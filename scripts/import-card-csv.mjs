import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CREDIT_CARD_DIR = path.join(process.cwd(), 'credit-card');
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'card_transactions.json');

function parseAmount(value) {
  if (!value) return 0;
  return Number(value.replace(/["\s,]/g, '')) || 0;
}

function splitCSVLine(line) {
  const parts = [];
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

function normalizePaymentYYYYMM(paymentDate) {
  return paymentDate
    .replace('年', '')
    .replace('月', '')
    .replace('日', '')
    .replace(/\s/g, '')
    .slice(0, 6);
}

function normalizeShop(value) {
  return value.replace(/－/g, '−');
}

function isMalformedTrailingLine(parts) {
  return /^\d{4}\/\d{2}\/\d{2}$/.test(parts[3] ?? '');
}

function detectCardMeta(lines, fileName) {
  const targetCardLine = lines.find(line => line.startsWith('対象カード,')) ?? '';
  const targetCard = targetCardLine.split(',')[1]?.trim() ?? '';
  const isLumine = targetCard.includes('ルミネ');

  return {
    file: fileName,
    card: isLumine ? 'lumine' : 'view',
    card_label: isLumine ? 'ルミネカード（夏弥）' : 'ViewCard（未来）',
  };
}

function parseStatement(content, fileName) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const meta = detectCardMeta(lines, fileName);

  let paymentDate = '';
  let total = 0;
  let currentPerson = '';
  let dataStarted = false;
  const transactions = [];

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

function compareStatements(a, b) {
  if (a.payment_yyyymm !== b.payment_yyyymm) {
    return b.payment_yyyymm.localeCompare(a.payment_yyyymm);
  }

  if (a.card !== b.card) {
    return a.card === 'lumine' ? -1 : 1;
  }

  return a.file.localeCompare(b.file, 'ja');
}

function compareWithExistingOrder(existingOrder, a, b) {
  const indexA = existingOrder.get(a.file);
  const indexB = existingOrder.get(b.file);

  if (indexA != null && indexB != null) {
    return indexA - indexB;
  }

  if (indexA != null) return 1;
  if (indexB != null) return -1;

  return compareStatements(a, b);
}

async function main() {
  const decoder = new TextDecoder('shift-jis');
  const files = (await readdir(CREDIT_CARD_DIR))
    .filter(fileName => /利用明細.*\.csv$/i.test(fileName))
    .sort((a, b) => a.localeCompare(b, 'ja'));

  const statements = [];

  for (const fileName of files) {
    const fullPath = path.join(CREDIT_CARD_DIR, fileName);
    const buffer = await readFile(fullPath);
    const content = decoder.decode(buffer);
    statements.push(parseStatement(content, fileName));
  }

  let currentJson = '';
  let existingOrder = new Map();

  try {
    currentJson = await readFile(OUTPUT_PATH, 'utf8');
    const currentData = JSON.parse(currentJson);
    existingOrder = new Map(
      (currentData.statements ?? []).map((statement, index) => [statement.file, index])
    );
  } catch {}

  statements.sort((a, b) => compareWithExistingOrder(existingOrder, a, b));

  const nextJson = JSON.stringify({ statements }, null, 2);

  if (currentJson === nextJson) {
    console.log('data/card_transactions.json is already up to date');
    return;
  }

  await writeFile(OUTPUT_PATH, nextJson, 'utf8');
  console.log(`Updated data/card_transactions.json with ${statements.length} statements`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
