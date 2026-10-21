// Rebuild the mufg entries of data/transactions.json from UFJ Direct statement CSVs (Shift-JIS).
// The CSVs are the source of truth; other accounts (Resona etc.) are kept as is.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CSV_DIR = path.join(ROOT, 'bank', 'mufg-csv');
const TRANSACTIONS_PATH = path.join(ROOT, 'data', 'transactions.json');

// [summary regex, detail regex, direction, category, note]
// Evaluated top to bottom; the first match wins.
const RULES = [
  [/^振込/, /ウエルスパーク（カ/, 'income', 'salary', '給与'],
  [/^給料$/, /^$/, 'income', 'salary', '給与'],
  [/^振込/, /ウエルスパークオルタナテイフ/, 'income', 'other_income', 'ウェルスパーク・オルタナティブから入金'],
  [/^振込/, /ヨコハマシジドウ/, 'income', 'child_allowance', '横浜市 児童手当'],
  [/^振込/, /ヨコハマブツカダカテ/, 'income', 'subsidy', '横浜市 物価高騰対策支援等'],
  [/^振込/, /ヨコハマシチヨウセイキユウフ/, 'income', 'subsidy', '横浜市 調整給付'],
  [/^利息$/, /.*/, 'income', 'interest', '普通預金利息'],
  [/^振込/, /フアンズ/, 'income', 'other_income', 'Funds 分配・償還'],
  [/^振込/, /ニホンクラウドシヨウケン/, 'income', 'other_income', '日本クラウド証券 分配・償還'],
  [/^振込/, /ストアーズ/, 'income', 'other_income', 'STORES 売上入金'],
  [/^振込/, /トウキヨウトジヨウホウ/, 'income', 'other_income', '東京都情報サービス産業健保 給付'],
  [/^振込/, /ビユーカード/, 'income', 'other_income', 'VIEWカード返金'],
  [/^口座振替/, /ビユーカード/, 'expense', 'card_payment', 'VIEWカード引き落とし'],
  [/^ＢＡＮＣＳ$/, /フリコミテスウリヨウ/, 'expense', 'other_expense', '振込手数料'],
  [/^手数料$/, /.*/, 'expense', 'other_expense', '手数料'],
  [/^ＢＡＮＣＳ$/, /ミツイスミトモギンコウ/, 'expense', 'cash_withdrawal', '三井住友銀行ATM出金'],
  [/^ＢＡＮＣＳ$/, /ミツイスミトモギンコウ/, 'income', 'other_income', '三井住友銀行ATM入金'],
  [/^カードＣ１$/, /セブンギンコウＡＴＭ/, 'expense', 'cash_withdrawal', 'セブン銀行ATM出金'],
  [/^(カードＣ１|カード)$/, /^$/, 'expense', 'cash_withdrawal', 'キャッシュカード出金'],
  [/^ＭＩＣＳ$/, /.*/, 'expense', 'cash_withdrawal', '他行ATM出金'],
  [/^口座振替/, /ＲＴＫ　ペイペイ/, 'expense', 'other_expense', 'PayPayチャージ'],
  [/^口座振替/, /ＲＴＫ　ＫＹＡＳＨ/, 'expense', 'other_expense', 'Kyashチャージ'],
  [/^振込ＩＢ/, /マツモト　カヤ/, 'expense', 'internal_transfer', 'りそなへ口座間移動'],
  [/^口座振替/, /ヨコハマシキユウシヨクヒ/, 'expense', 'utilities', '給食費'],
  [/^口座振替/, /オオグチダイシヨ/, 'expense', 'utilities', '大口台小学校'],
  [/^口座振替/, /シラハタヨウチエン/, 'expense', 'utilities', '白幡幼稚園'],
  [/^口座振替/, /ＭＢＳ．トウカイニチド/, 'expense', 'insurance', '東京海上日動'],
  [/^口座振替/, /ＤＦ．ホシヨウセイド/, 'expense', 'other_expense', 'DF.保証制度'],
  [/^振込/, /ベン）エーエルジー/, 'expense', 'other_expense', '弁護士法人ALG（推定）'],
  [/^振込/, /マツモト　タカシ|ワタナベ　タイコ/, 'expense', 'other_expense', '個人への振込'],
  [/^振込/, /マツモト　タカシ/, 'income', 'other_income', '個人からの振込'],
];

// Long vowels come from half-width kana as a hyphen (U+FF0D or U+2212 depending on the decoder)
const normalize = s => s.replace(/[－−]/g, 'ー');
const toNumber = s => (s ? Number(s.replace(/,/g, '')) : 0);

function parseLine(line) {
  return line.split('","').map(cell => cell.replace(/^"|"$/g, ''));
}

function classify(summary, detail, direction) {
  for (const [summaryRe, detailRe, dir, category, note] of RULES) {
    if (dir === direction && summaryRe.test(summary) && detailRe.test(detail)) {
      return { category, note };
    }
  }
  return {
    category: direction === 'income' ? 'other_income' : 'other_expense',
    note: '',
  };
}

async function main() {
  const decoder = new TextDecoder('shift-jis');
  const files = (await readdir(CSV_DIR)).filter(f => f.endsWith('.csv')).sort();

  // Allow overlapping CSVs: identical lines (balance included) count once
  const seen = new Set();
  const rows = [];
  for (const fileName of files) {
    const lines = decoder.decode(await readFile(path.join(CSV_DIR, fileName))).split(/\r?\n/);
    for (const line of lines.slice(1)) {
      if (!line.trim() || seen.has(line)) continue;
      seen.add(line);
      const [date, summary, detail, paid, received, balance] = parseLine(line).map(normalize);
      const [y, m, d] = date.split('/').map(Number);
      rows.push({
        date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        summary,
        detail,
        paid: toNumber(paid),
        received: toNumber(received),
        balance: toNumber(balance),
      });
    }
  }
  // Keep CSV order within a day (posting order)
  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Detect missing or duplicated rows via the balance chain
  for (let i = 1; i < rows.length; i++) {
    const expected = rows[i - 1].balance - rows[i].paid + rows[i].received;
    if (expected !== rows[i].balance) {
      throw new Error(`Balance chain broken at: ${rows[i].date} ${rows[i].summary} ${rows[i].detail}`);
    }
  }

  const perDay = new Map();
  const unmatched = [];
  const mufg = rows.map(row => {
    const seq = (perDay.get(row.date) ?? 0) + 1;
    perDay.set(row.date, seq);
    const direction = row.received > 0 ? 'income' : 'expense';
    const { category, note } = classify(row.summary, row.detail, direction);
    if (!note) unmatched.push(`${row.date} ${row.summary} ${row.detail}`);
    return {
      id: `mufg-${row.date}-${seq}`,
      date: row.date,
      account: 'mufg',
      type: direction,
      amount: row.received || row.paid,
      description: `${row.summary} ${row.detail}`.trim(),
      category,
      note,
      balance_after: row.balance,
    };
  });

  const current = JSON.parse(await readFile(TRANSACTIONS_PATH, 'utf8'));
  const others = current.transactions.filter(t => t.account !== 'mufg');
  const transactions = [...others, ...mufg].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.account.localeCompare(b.account) ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
  await writeFile(TRANSACTIONS_PATH, `${JSON.stringify({ ...current, transactions }, null, 2)}\n`);

  console.log(`mufg: ${mufg.length} rows (${rows[0].date} to ${rows.at(-1).date}, closing balance ${rows.at(-1).balance.toLocaleString()} JPY)`);
  console.log(`other accounts: ${others.length} rows kept`);
  if (unmatched.length) {
    console.log(`${unmatched.length} rows matched no rule (classified as other):`);
    unmatched.forEach(u => console.log(`  ${u}`));
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
