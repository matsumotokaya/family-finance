// Shared types + verification for bank-screenshot extraction.
// Verification is pure and runs regardless of which model produced the draft.

import { Transaction } from '@/types';

export type DraftTransaction = Omit<Transaction, 'id'> & { id?: string };

export interface ExtractionResult {
  account: Transaction['account'];
  transactions: DraftTransaction[];
}

export interface VerifiedTransaction extends DraftTransaction {
  id: string;
  balanceOk: boolean | null; // null = no balance to check against
}

export interface VerifyReport {
  account: Transaction['account'];
  transactions: VerifiedTransaction[];
  chainConsistent: boolean;
  warnings: string[];
}

// signed effect on the balance for a row
function signedDelta(t: DraftTransaction): number {
  if (t.type === 'income') return t.amount;
  return -t.amount; // expense / transfer both reduce this account's balance
}

// Verify the balance chain: balance_after[n-1] + delta[n] === balance_after[n].
// Rows are validated within one account, in date order (stable).
export function verifyExtraction(result: ExtractionResult): VerifyReport {
  const warnings: string[] = [];
  const rows = [...result.transactions].sort((a, b) => a.date.localeCompare(b.date));

  let chainConsistent = true;
  let prevBalance: number | null = null;

  const transactions: VerifiedTransaction[] = rows.map((t, index) => {
    let balanceOk: boolean | null = null;

    if (typeof t.balance_after === 'number') {
      if (prevBalance !== null) {
        const expected = prevBalance + signedDelta(t);
        balanceOk = expected === t.balance_after;
        if (!balanceOk) {
          chainConsistent = false;
          warnings.push(
            `${t.date} ${t.description || '(no desc)'}: 残高が連鎖しません（前残高 ${prevBalance.toLocaleString()} ${signedDelta(t) >= 0 ? '+' : '−'} ${Math.abs(t.amount).toLocaleString()} = ${(prevBalance + signedDelta(t)).toLocaleString()} ≠ 記載 ${t.balance_after.toLocaleString()}）`,
          );
        }
      }
      prevBalance = t.balance_after;
    }

    return {
      ...t,
      id: t.id ?? `${result.account}-${t.date}-${index + 1}`,
      balanceOk,
    };
  });

  return { account: result.account, transactions, chainConsistent, warnings };
}

// JSON Schema for structured output — mirrors the Transaction type.
// OpenAI strict mode requires every property in `required` and represents
// optional fields as nullable (`type: [..., 'null']`).
export const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    account: {
      type: 'string',
      enum: ['mufg', 'resona', 'yucho_daughter', 'yucho_son'],
      description: '口座。三菱UFJ=mufg、りそな=resona、ゆうちょ(娘)=yucho_daughter、ゆうちょ(息子)=yucho_son',
    },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD形式。西暦が不明なら文脈から推定' },
          type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
          amount: { type: 'integer', description: '常に正の整数(円)' },
          description: { type: 'string', description: '取引先・摘要。画面の表記そのまま' },
          category: {
            type: 'string',
            enum: [
              'salary', 'child_allowance', 'subsidy', 'interest', 'housing_loan',
              'card_payment', 'utilities', 'insurance', 'cash_withdrawal',
              'internal_transfer', 'other_income', 'other_expense',
            ],
          },
          note: { type: ['string', 'null'], description: '補足。無ければ null' },
          balance_after: {
            type: ['integer', 'null'],
            description: '取引後の残高(円)。画面に残高列があれば必ず入れる。無ければ null',
          },
        },
        required: ['date', 'type', 'amount', 'description', 'category', 'note', 'balance_after'],
      },
    },
  },
  required: ['account', 'transactions'],
} as const;

export const EXTRACTION_SYSTEM = `あなたは日本の銀行アプリの入出金明細スクリーンショットを読み取り、構造化データに変換するアシスタントです。

ルール:
- 画面に写っている取引をすべて漏れなく抽出する。
- 金額(amount)は常に正の整数。入金なら type=income、出金なら type=expense、口座間振替は type=transfer。
- 残高列がある場合、balance_after に取引後残高を必ず入れる(検算に使う)。
- 日付は YYYY-MM-DD。年が画面にない場合は他の手がかりから推定する。
- category は摘要から最も近いものを選ぶ。給与→salary、児童手当→child_allowance、ローン→housing_loan、クレカ引き落とし→card_payment、水道光熱・給食費→utilities、保険→insurance、現金引き出し→cash_withdrawal、口座間移動→internal_transfer、判断できない収入→other_income、支出→other_expense。
- 推測できない項目は空文字にする。勝手に取引を作らない。`;
