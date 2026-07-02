import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BANK_DIR = path.join(ROOT, 'bank');
const CREDIT_CARD_DIR = path.join(ROOT, 'credit-card');
const TRANSACTIONS_PATH = path.join(ROOT, 'data', 'transactions.json');
const CARD_TRANSACTIONS_PATH = path.join(ROOT, 'data', 'card_transactions.json');

function parseAmount(value) {
  const normalized = value.replace(/[(),]/g, '').trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parsePendingCardText(fileName, rawText) {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const transactions = [];
  let currentYear = '';
  const occurrenceCount = {};

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
    const cardLast4Match = maskedCardNumber.match(/(\d{4})$/);
    const cardLast4 = cardLast4Match?.[1] ?? '----';
    const baseKey = `${currentYear}-${month}-${day}-${cardLast4}-${merchant}-${amount}`;
    const occurrence = occurrenceCount[baseKey] ?? 0;
    occurrenceCount[baseKey] = occurrence + 1;

    transactions.push({
      id: `${baseKey}-${occurrence}`,
      date: `${currentYear}-${month}-${day}`,
      merchant,
      amount,
      paymentType,
      sourceFile: fileName,
    });

    if (detailLine.startsWith('(')) {
      index += 1;
    }
  }

  return transactions;
}

function formatTimestamp(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

async function getLatestBankDirs() {
  const entries = await readdir(BANK_DIR, { withFileTypes: true });
  const dirs = entries
    .filter(entry => entry.isDirectory() && /^\d{8}(-risona)?$/.test(entry.name))
    .map(entry => entry.name)
    .sort();

  const mufg = dirs.filter(name => !name.endsWith('-risona')).at(-1) ?? null;
  const risona = dirs.filter(name => name.endsWith('-risona')).at(-1) ?? null;
  return { mufg, risona };
}

async function getLatestPendingSummary() {
  const files = (await readdir(CREDIT_CARD_DIR))
    .filter(fileName => fileName.startsWith('未確定決済情報_'))
    .sort((a, b) => b.localeCompare(a, 'ja'));

  if (files.length === 0) {
    return null;
  }

  const confirmedData = JSON.parse(await readFile(CARD_TRANSACTIONS_PATH, 'utf8'));
  const confirmedSet = new Set();
  for (const statement of confirmedData.statements) {
    for (const transaction of statement.transactions) {
      confirmedSet.add(`${transaction.date.replace(/\//g, '-')}-${transaction.shop}-${transaction.amount}`);
    }
  }

  const allTransactions = new Map();
  for (const fileName of files) {
    const rawText = await readFile(path.join(CREDIT_CARD_DIR, fileName), 'utf8');
    const transactions = parsePendingCardText(fileName, rawText);

    for (const transaction of transactions) {
      if (!confirmedSet.has(`${transaction.date}-${transaction.merchant}-${transaction.amount}`)) {
        if (!allTransactions.has(transaction.id)) {
          allTransactions.set(transaction.id, transaction);
        }
      }
    }
  }

  const merged = Array.from(allTransactions.values());
  const months = Array.from(new Set(merged.map(transaction => transaction.date.slice(0, 7).replace('-', '')))).sort();

  return {
    latestFile: files[0],
    fileCount: files.length,
    transactionCount: merged.length,
    months,
  };
}

async function isNewerThan(filePath, targetPath) {
  const [sourceStat, targetStat] = await Promise.all([stat(filePath), stat(targetPath)]);
  return sourceStat.mtimeMs > targetStat.mtimeMs;
}

async function main() {
  console.log('== Confirmed card CSV import ==');
  execFileSync('node', ['scripts/import-card-csv.mjs'], { cwd: ROOT, stdio: 'inherit' });

  const bankDirs = await getLatestBankDirs();
  const pending = await getLatestPendingSummary();
  const transactionsStat = await stat(TRANSACTIONS_PATH);

  console.log('');
  console.log('== Latest sources ==');
  console.log(`data/transactions.json updated: ${formatTimestamp(transactionsStat.mtime)}`);
  console.log(`latest MUFG bank dir:   ${bankDirs.mufg ?? '(none)'}`);
  console.log(`latest Resona bank dir: ${bankDirs.risona ?? '(none)'}`);

  if (pending) {
    console.log(`latest pending file:    ${pending.latestFile}`);
    console.log(`pending tx count:       ${pending.transactionCount}`);
    console.log(`pending months:         ${pending.months.join(', ')}`);
  } else {
    console.log('latest pending file:    (none)');
  }

  const checks = [];
  if (bankDirs.mufg) {
    checks.push({
      label: bankDirs.mufg,
      newer: await isNewerThan(path.join(BANK_DIR, bankDirs.mufg), TRANSACTIONS_PATH),
    });
  }
  if (bankDirs.risona) {
    checks.push({
      label: bankDirs.risona,
      newer: await isNewerThan(path.join(BANK_DIR, bankDirs.risona), TRANSACTIONS_PATH),
    });
  }

  console.log('');
  console.log('== Follow-up ==');
  if (checks.some(check => check.newer)) {
    console.log('Bank screenshots newer than data/transactions.json were found.');
    for (const check of checks.filter(item => item.newer)) {
      console.log(`- Review bank/${check.label} and update data/transactions.json`);
    }
  } else {
    console.log('Bank screenshots are already reflected in data/transactions.json or are not newer.');
  }

  if (pending) {
    console.log('Pending card data needs no JSON regeneration. /pending reads credit-card/未確定決済情報_* directly.');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
