import { NextResponse } from 'next/server';
import { getLatestPendingSnapshot, getPendingMonths } from '@/lib/pendingCardUtils';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabase = getSupabaseServer();
  let rawCount: number | null = null;
  let rawError: string | null = null;
  if (supabase) {
    const { data, error } = await supabase.from('ff_pending_transactions').select('id,date');
    rawCount = data?.length ?? null;
    rawError = error?.message ?? null;
  }

  const snapshot = await getLatestPendingSnapshot();
  const months = snapshot ? getPendingMonths(snapshot.transactions) : [];

  const julyInFinal = snapshot ? snapshot.transactions.filter(t => t.date.startsWith('2026-07')) : [];
  const bySource: Record<string, number> = {};
  if (snapshot) {
    for (const t of snapshot.transactions) {
      bySource[t.sourceFile] = (bySource[t.sourceFile] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    hasUrl,
    hasKey,
    rawCount,
    rawError,
    snapshotFileName: snapshot?.fileName,
    snapshotTxCount: snapshot?.transactions.length,
    months,
    julyInFinalCount: julyInFinal.length,
    julyInFinalSample: julyInFinal.slice(0, 3),
    bySource,
  });
}
