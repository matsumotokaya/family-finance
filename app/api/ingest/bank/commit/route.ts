import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { VerifiedTransaction } from '@/lib/bankExtract';

export const dynamic = 'force-dynamic';

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Step 3 of the pipeline: persist the human-reviewed draft to ff_bank_transactions.
// The client sends back the (possibly edited) rows plus the account.
export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase env vars are not configured.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const account: string | undefined = body?.account;
  const transactions: VerifiedTransaction[] = Array.isArray(body?.transactions) ? body.transactions : [];

  if (!account || transactions.length === 0) {
    return NextResponse.json({ error: 'account と transactions が必要です。' }, { status: 400 });
  }

  const { data: source, error: sourceError } = await supabase
    .from('ff_sources')
    .insert({ kind: 'bank_screenshot', label: `銀行取込 ${account} ${todayJst()}` })
    .select('id')
    .single();
  if (sourceError) {
    return NextResponse.json({ error: `原本の記録に失敗: ${sourceError.message}` }, { status: 500 });
  }

  const rows = transactions.map((t, index) => ({
    id: t.id ?? `${account}-${t.date}-${index + 1}`,
    date: t.date,
    account,
    type: t.type,
    amount: t.amount,
    description: t.description ?? '',
    category: t.category,
    note: t.note ?? '',
    balance_after: typeof t.balance_after === 'number' ? t.balance_after : null,
    source_id: source.id,
  }));

  const { error } = await supabase.from('ff_bank_transactions').upsert(rows, { onConflict: 'id' });
  if (error) {
    return NextResponse.json({ error: `保存に失敗: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ saved: rows.length });
}
