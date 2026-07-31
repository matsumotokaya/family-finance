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
  let starCount: number | null = null;
  let starError: string | null = null;
  let starStatus: number | null = null;
  let plainFetchCount: number | null = null;
  let plainFetchStatus: number | null = null;
  if (supabase) {
    const { data, error } = await supabase.from('ff_pending_transactions').select('id,date');
    rawCount = data?.length ?? null;
    rawError = error?.message ?? null;

    const starRes = await supabase.from('ff_pending_transactions').select('*');
    starCount = starRes.data?.length ?? null;
    starError = starRes.error?.message ?? null;
    starStatus = starRes.status;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const plainRes = await fetch(`${url}/rest/v1/ff_pending_transactions?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    plainFetchStatus = plainRes.status;
    const plainJson = await plainRes.json().catch(() => null);
    plainFetchCount = Array.isArray(plainJson) ? plainJson.length : null;
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
    starCount,
    starError,
    starStatus,
    plainFetchCount,
    plainFetchStatus,
    snapshotFileName: snapshot?.fileName,
    snapshotTxCount: snapshot?.transactions.length,
    months,
    julyInFinalCount: julyInFinal.length,
    julyInFinalSample: julyInFinal.slice(0, 3),
    bySource,
  });
}
