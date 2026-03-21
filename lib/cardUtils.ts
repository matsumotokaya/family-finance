export interface CardTransaction {
  date: string;
  shop: string;
  amount: number;
  refund: number;
  this_charge: number;
  net: number;
  pay_type: string;
  person: string;
}

export interface CardStatement {
  file: string;
  card: 'view' | 'lumine';
  card_label: string;
  payment_date: string;
  payment_yyyymm: string;
  total: number;
  transactions: CardTransaction[];
}

export const VIEW_CARD_MIKU_LIMIT = 40000;

export function getMonthLabel(yyyymm: string): string {
  const y = yyyymm.slice(0, 4);
  const m = parseInt(yyyymm.slice(4, 6));
  return `${y}年${m}月`;
}

// Categorize shop names into spending categories
export function categorizeShop(shop: string): ShopCategory {
  const s = shop.toUpperCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

  if (/AMAZON|ＡＭＺ/.test(s)) return 'amazon';
  if (/APPLE|ＡＰＰ/.test(s)) return 'apple';
  if (/NETFLIX|ネットフリ/.test(s)) return 'subscription';
  if (/OPENAI|CLAUDE|MIDJOURNEY|CHATGPT/.test(s)) return 'digital_tools';
  if (/ソフトバンク|ラインモバイル|KDDI|マイクロソフト/.test(s)) return 'communication';
  if (/オーケー|OK|ヨークマート|マイバスケ|スーパー|ニシテラオ|ミヨウレンジ|ヨコハマスイドウ以外|スーパーマーケット/.test(s)) return 'food';
  if (/セブン|ファミリー|ローソン|コンビニ|ミニストップ|ファミマ/.test(s)) return 'convenience';
  if (/ガス|水道|電気|東京ガス|関東電気/.test(s)) return 'utilities';
  if (/ETC|ＥＴＣ|タイムズ|パーキング|駐車場|鉄道|電車/.test(s)) return 'transport';
  if (/キッズ|ヘアサロン|ヨウジカツドウ|幼児活動|シーソー|SEESAW|ようじ/.test(s)) return 'child';
  if (/H&M|エイチアンドエム|ZARA|ユニクロ|ルミネ|NEXT|ファッション|アパレル/.test(s)) return 'fashion';
  if (/レストラン|サイゼ|吉野家|ヨシノヤ|カフェ|コーヒー|マクドナルド|ラーメン|飲食/.test(s)) return 'dining';
  if (/ドラッグ|クリエイト|薬局|マツキヨ/.test(s)) return 'drugstore';
  if (/保険|メットライフ|生命|損保/.test(s)) return 'insurance';
  if (/美容|ヘア|サロン|エステ/.test(s)) return 'beauty';
  if (/水道|ガス|電|光熱|ヨコハマスイドウ/.test(s)) return 'utilities';
  if (/オーケー|OK|ヨークマ|マイバスケ|ロリポップ/.test(s)) return 'food';
  return 'other';
}

export type ShopCategory =
  | 'amazon' | 'apple' | 'subscription' | 'digital_tools' | 'communication'
  | 'food' | 'convenience' | 'utilities' | 'transport' | 'child' | 'fashion'
  | 'dining' | 'drugstore' | 'insurance' | 'beauty' | 'other';

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  amazon: 'Amazon',
  apple: 'Apple サービス',
  subscription: 'サブスクリプション',
  digital_tools: 'デジタルツール',
  communication: '通信・ソフトウェア',
  food: 'スーパー・食料品',
  convenience: 'コンビニ',
  utilities: '公共料金',
  transport: '交通・駐車',
  child: '子供関連',
  fashion: 'ファッション',
  dining: '飲食店',
  drugstore: 'ドラッグストア',
  insurance: '保険',
  beauty: '美容',
  other: 'その他',
};

export const CATEGORY_COLORS: Record<ShopCategory, string> = {
  amazon: '#ff9900',
  apple: '#555555',
  subscription: '#8b5cf6',
  digital_tools: '#3b82f6',
  communication: '#06b6d4',
  food: '#22c55e',
  convenience: '#84cc16',
  utilities: '#94a3b8',
  transport: '#0ea5e9',
  child: '#f472b6',
  fashion: '#f97316',
  dining: '#ef4444',
  drugstore: '#10b981',
  insurance: '#6366f1',
  beauty: '#ec4899',
  other: '#9ca3af',
};

export interface MonthlySummary {
  yyyymm: string;
  label: string;
  viewMiku: number;
  viewNatsuya: number;
  lumine: number;
  total: number;
  viewMikuOver: number;
}

export function buildMonthlySummaries(statements: CardStatement[]): MonthlySummary[] {
  const map = new Map<string, MonthlySummary>();

  for (const s of statements) {
    const m = s.payment_yyyymm;
    if (!map.has(m)) {
      map.set(m, {
        yyyymm: m,
        label: getMonthLabel(m),
        viewMiku: 0, viewNatsuya: 0, lumine: 0, total: 0, viewMikuOver: 0,
      });
    }
    const entry = map.get(m)!;

    for (const t of s.transactions) {
      if (t.net <= 0) continue;
      if (s.card === 'view') {
        if (t.person.includes('未来')) entry.viewMiku += t.net;
        else entry.viewNatsuya += t.net;
      } else {
        entry.lumine += t.net;
      }
    }
    entry.total = entry.viewMiku + entry.viewNatsuya + entry.lumine;
    entry.viewMikuOver = Math.max(0, entry.viewMiku - VIEW_CARD_MIKU_LIMIT);
  }

  return Array.from(map.values()).sort((a, b) => a.yyyymm.localeCompare(b.yyyymm));
}

export interface CategorySummary {
  category: ShopCategory;
  label: string;
  color: string;
  amount: number;
  count: number;
}

export function getCategoryBreakdown(transactions: CardTransaction[]): CategorySummary[] {
  const map = new Map<ShopCategory, { amount: number; count: number }>();
  for (const t of transactions) {
    if (t.net <= 0) continue;
    const cat = categorizeShop(t.shop);
    const cur = map.get(cat) || { amount: 0, count: 0 };
    cur.amount += t.net;
    cur.count += 1;
    map.set(cat, cur);
  }
  return Array.from(map.entries())
    .map(([cat, data]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      color: CATEGORY_COLORS[cat],
      ...data,
    }))
    .sort((a, b) => b.amount - a.amount);
}
