export type AccountType = 'mufg' | 'resona' | 'yucho_daughter' | 'yucho_son';

export type TransactionCategory =
  | 'salary'           // 給与
  | 'child_allowance'  // 児童手当
  | 'subsidy'          // 補助・支援金
  | 'interest'         // 利息
  | 'housing_loan'     // 住宅ローン
  | 'card_payment'     // クレカ引き落とし
  | 'utilities'        // 公共料金・給食費
  | 'insurance'        // 保険料
  | 'cash_withdrawal'  // 現金引き出し
  | 'internal_transfer'// 口座間移動（収支計算から除外）
  | 'other_income'
  | 'other_expense';

export interface Transaction {
  id: string;
  date: string;        // YYYY-MM-DD
  account: AccountType;
  type: 'income' | 'expense' | 'transfer';
  amount: number;      // always positive
  description: string;
  category: TransactionCategory;
  note?: string;
  balance_after?: number; // 取引後の口座残高（スクショから取得）
}

export interface AppConfig {
  familyName: string;
  monthlyTargetSavings: number;
  standardMonthlyIncome: number; // 見込み給与（基準値）
  mortgageEndYear: number;
  mortgageEndMonth: number;
  incompleteMonths: string[]; // "YYYY-MM" format
}

export interface MonthlyStats {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;          // 確定収支: 実際の収入 − 支出
  projectedNetBalance: number; // 見込み収支: 標準収入 − 支出
  transactions: Transaction[];
  isIncomplete: boolean;
}

export interface CategoryItem {
  category: TransactionCategory;
  label: string;
  amount: number;
  color: string;
}
