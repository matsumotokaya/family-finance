'use client';
import { useState } from 'react';
import Link from 'next/link';
import HamburgerMenu from './HamburgerMenu';
import PageHeader from './PageHeader';
import { formatCurrency } from '@/lib/dataUtils';

type Tab = 'bank' | 'pending' | 'cards';

interface VerifiedRow {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: string;
  note?: string;
  balance_after?: number;
  balanceOk: boolean | null;
}

interface VerifyReport {
  account: string;
  transactions: VerifiedRow[];
  chainConsistent: boolean;
  warnings: string[];
}

const ACCOUNT_LABELS: Record<string, string> = {
  mufg: '三菱UFJ',
  resona: 'りそな',
  yucho_daughter: 'ゆうちょ（娘）',
  yucho_son: 'ゆうちょ（息子）',
};

const TYPE_LABELS: Record<string, string> = {
  income: '入金',
  expense: '出金',
  transfer: '振替',
};

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
        active ? 'bg-white text-slate-900' : 'bg-white/10 text-white/80'
      }`}
    >
      {children}
    </button>
  );
}

export default function IngestPage() {
  const [tab, setTab] = useState<Tab>('bank');

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <PageHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link href="/" className="text-white/60 text-xs">← ダッシュボード</Link>
            <h1 className="text-lg font-bold mt-0.5">データ取り込み</h1>
          </div>
          <HamburgerMenu />
        </div>
        <div className="flex gap-2">
          <TabButton active={tab === 'bank'} onClick={() => setTab('bank')}>🏦 銀行スクショ</TabButton>
          <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>🕒 未確定貼付</TabButton>
          <TabButton active={tab === 'cards'} onClick={() => setTab('cards')}>💳 カードCSV</TabButton>
        </div>
      </PageHeader>

      <main className="max-w-xl mx-auto px-4 pt-5">
        {tab === 'bank' && <BankPanel />}
        {tab === 'pending' && <PendingPanel />}
        {tab === 'cards' && <CardsPanel />}
      </main>
    </div>
  );
}

function Notice({ kind, children }: { kind: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  const styles = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return <div className={`text-sm rounded-xl border px-4 py-3 ${styles[kind]}`}>{children}</div>;
}

// ---- Bank screenshot panel ----
function BankPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<VerifyReport | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [committing, setCommitting] = useState(false);

  async function runExtract() {
    if (files.length === 0) return;
    setLoading(true);
    setError('');
    setReport(null);
    setSaved(false);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const res = await fetch('/api/ingest/bank/extract', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '抽出に失敗しました');
      setReport(json as VerifyReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!report) return;
    setCommitting(true);
    setError('');
    try {
      const res = await fetch('/api/ingest/bank/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: report.account, transactions: report.transactions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '保存に失敗しました');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        MUFG・りそなアプリの入出金明細をスクショして、そのまま添付してください。AIが読み取り、残高の連鎖を検算してから確定できます。
      </p>

      <label className="block bg-white rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer">
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => setFiles(Array.from(e.target.files ?? []))}
        />
        <span className="text-slate-500 text-sm">
          {files.length > 0 ? `${files.length}枚を選択中` : 'タップして画像を選択（複数可）'}
        </span>
      </label>

      <button
        onClick={runExtract}
        disabled={files.length === 0 || loading}
        className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-40"
      >
        {loading ? 'AIが読み取り中…' : 'AIで読み取る'}
      </button>

      {error && <Notice kind="error">{error}</Notice>}

      {report && (
        <div className="space-y-3">
          <Notice kind={report.chainConsistent ? 'success' : 'info'}>
            口座: <b>{ACCOUNT_LABELS[report.account] ?? report.account}</b> / {report.transactions.length}件
            {report.chainConsistent ? ' — 残高チェックOK ✅' : ' — 残高が合わない行があります ⚠️'}
          </Notice>

          {report.warnings.length > 0 && (
            <Notice kind="info">
              <ul className="list-disc pl-4 space-y-1">
                {report.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </Notice>
          )}

          <div className="bg-white rounded-2xl overflow-hidden divide-y">
            {report.transactions.map(t => (
              <div
                key={t.id}
                className={`px-4 py-2.5 text-sm flex justify-between gap-3 ${
                  t.balanceOk === false ? 'bg-red-50' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="text-slate-500 text-xs">{t.date}・{TYPE_LABELS[t.type]}</div>
                  <div className="truncate">{t.description || '（摘要なし）'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={t.type === 'income' ? 'text-green-600 font-bold' : 'font-bold'}>
                    {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                  </div>
                  {typeof t.balance_after === 'number' && (
                    <div className="text-slate-400 text-xs">残 {formatCurrency(t.balance_after)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {saved ? (
            <Notice kind="success">保存しました。ダッシュボードに反映されます。</Notice>
          ) : (
            <button
              onClick={commit}
              disabled={committing}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40"
            >
              {committing ? '保存中…' : 'この内容で確定して保存'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Pending paste panel ----
function PendingPanel() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ parsed: number; inserted: number; alreadyKnown: number } | null>(null);
  const [error, setError] = useState('');

  async function submit() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/ingest/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '取り込みに失敗しました');
      setResult(json);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        VIEW&apos;s NET の「未確定決済情報」の明細表を、ページごとに選択してコピーし、ここに貼り付けてください。
        同じ取引を何度貼っても自動で重複排除されます（確定済みの明細は消し込まれます）。
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="ここに貼り付け…"
        className="w-full h-48 rounded-2xl border border-slate-300 p-4 text-sm font-mono"
      />

      <button
        onClick={submit}
        disabled={!text.trim() || loading}
        className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-40"
      >
        {loading ? '取り込み中…' : '取り込む'}
      </button>

      {error && <Notice kind="error">{error}</Notice>}
      {result && (
        <Notice kind="success">
          {result.parsed}件を認識 → 新規 <b>{result.inserted}</b>件を追加
          {result.alreadyKnown > 0 && `（既知 ${result.alreadyKnown}件はスキップ）`}
        </Notice>
      )}
    </div>
  );
}

// ---- Card CSV panel ----
function CardsPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ card_label: string; payment_yyyymm: string; total: number; transactionCount: number; replaced: boolean } | null>(null);
  const [error, setError] = useState('');

  async function submit() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ingest/cards', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '取り込みに失敗しました');
      setResult(json);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        VIEW&apos;s NET でダウンロードした確定明細CSV（Shift-JIS）をアップロードしてください。カードは自動判別します。
      </p>

      <label className="block bg-white rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-slate-500 text-sm">{file ? file.name : 'タップしてCSVを選択'}</span>
      </label>

      <button
        onClick={submit}
        disabled={!file || loading}
        className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-40"
      >
        {loading ? '取り込み中…' : '取り込む'}
      </button>

      {error && <Notice kind="error">{error}</Notice>}
      {result && (
        <Notice kind="success">
          <b>{result.card_label}</b>（{result.payment_yyyymm}）を取り込みました。{result.transactionCount}件 / 請求 {formatCurrency(result.total)}
          {result.replaced && '（既存を差し替え）'}
        </Notice>
      )}
    </div>
  );
}
