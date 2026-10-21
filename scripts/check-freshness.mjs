// Report which statements are missing so the user can be asked to upload them.
// Usage: node scripts/check-freshness.mjs [--hook]
//   --hook  print JSON for a Claude Code SessionStart hook
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const LINKS = {
  viewsnet: 'https://www.viewsnet.jp/default.aspx?sv=w01',
  mufg: 'https://directg.s.bk.mufg.jp/APL/LGP_P_01/PU/LG_0001/LG_0001_PC01?link_id=direct_leftmenu_login_PC',
  ingest: 'https://family-finance-bay-one.vercel.app/ingest',
};
const VIEWSNET_SERVICE_ID = 'AALC3080';
const CARDS = ['ViewCard（未来）', 'ルミネカード（夏弥）'];

function todayJst() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1, day: jst.getUTCDate() };
}

const yyyymm = (year, month) => `${year}${String(month).padStart(2, '0')}`;

function addMonths(ym, n) {
  const total = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(4)) - 1 + n;
  return yyyymm(Math.floor(total / 12), (total % 12) + 1);
}

const label = ym => `${Number(ym.slice(0, 4))}年${Number(ym.slice(4))}月`;

async function readEnv() {
  try {
    const text = await readFile(path.join(ROOT, '.env.local'), 'utf8');
    return Object.fromEntries(
      text.split('\n')
        .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/))
        .filter(Boolean)
        .map(m => [m[1], m[2]]),
    );
  } catch {
    return {};
  }
}

async function fetchSupabase(env, query) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function main() {
  const hookMode = process.argv.includes('--hook');
  const env = await readEnv();
  const bankJson = JSON.parse(await readFile(path.join(ROOT, 'data', 'transactions.json'), 'utf8')).transactions;
  const cardJson = JSON.parse(await readFile(path.join(ROOT, 'data', 'card_transactions.json'), 'utf8'));
  const [bankDb, cardDb] = await Promise.all([
    fetchSupabase(env, 'ff_bank_transactions?select=account,date'),
    fetchSupabase(env, 'ff_card_statements?select=card_label,payment_yyyymm'),
  ]);

  // Latest bank date per account. Supabase rows only count after the JSON range
  // (same rule as lib/dataSource.ts).
  const latestBank = {};
  for (const t of bankJson) {
    if (t.date > (latestBank[t.account] ?? '')) latestBank[t.account] = t.date;
  }
  const jsonLatest = { ...latestBank };
  for (const row of bankDb ?? []) {
    if (row.date > (jsonLatest[row.account] ?? '') && row.date > (latestBank[row.account] ?? '')) {
      latestBank[row.account] = row.date;
    }
  }

  const cardMonths = {};
  for (const s of [...(cardJson.statements ?? cardJson), ...(cardDb ?? [])]) {
    (cardMonths[s.card_label] ??= new Set()).add(s.payment_yyyymm);
  }

  const today = todayJst();
  const thisMonth = yyyymm(today.year, today.month);
  const prevMonth = addMonths(thisMonth, -1);
  const missing = [];

  // Card statements are paid around the 4th-5th; every month from the first
  // imported one up to this month's payment should exist.
  for (const card of CARDS) {
    const have = cardMonths[card] ?? new Set();
    const first = [...have].sort()[0] ?? thisMonth;
    const gaps = [];
    for (let ym = first; ym <= thisMonth; ym = addMonths(ym, 1)) {
      if (!have.has(ym)) gaps.push(label(ym));
    }
    if (gaps.length > 0) missing.push(`カード確定明細 ${card}: ${gaps.join('、')}支払分`);
  }

  // Bank data counts as complete for last month once something from this month is in.
  const mufgLatest = latestBank.mufg ?? '';
  if (mufgLatest.replace(/-/g, '').slice(0, 6) < thisMonth && today.day >= 3) {
    missing.push(`三菱UFJ: ${mufgLatest || 'なし'} より後の入出金明細CSV`);
  }
  const resonaLatest = latestBank.resona ?? '';
  if (resonaLatest.replace(/-/g, '').slice(0, 6) < prevMonth) {
    missing.push(`りそな: ${resonaLatest || 'なし'} より後のスクショ`);
  }

  const offline = bankDb === null || cardDb === null ? '（Supabaseに接続できず、JSONだけで判定）' : '';
  const lines = missing.length === 0
    ? [`家計データは最新です${offline}。`]
    : [
        `家計データに未更新の分があります${offline}:`,
        ...missing.map(m => `- ${m}`),
        '',
        `カード: VIEW's NET ${LINKS.viewsnet}（サービスID ${VIEWSNET_SERVICE_ID}、パスワードは本人が入力）で確定明細CSVをダウンロードし、${LINKS.ingest} の「💳 カードCSV」からアップロード。`,
        `三菱UFJ: ${LINKS.mufg} で入出金明細CSVをダウンロードして保存場所を伝える（スクショを /ingest でも可）。`,
        'りそな: アプリのスクショを /ingest の「🏦 銀行スクショ」からアップロードし、確認画面で「りそな」を選んで保存。',
      ];
  const text = lines.join('\n');

  if (!hookMode) {
    console.log(text);
    return;
  }
  if (missing.length === 0) return;
  console.log(JSON.stringify({
    systemMessage: text,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `${text}\n\nAt the start of this session, tell the user (in Japanese) which statements are missing and ask them to upload them, using the links above. Detailed steps: docs/monthly-card-review.md.`,
    },
  }));
}

main().catch(error => {
  // Never block the session because of this check.
  if (!process.argv.includes('--hook')) console.error(error.message);
});
