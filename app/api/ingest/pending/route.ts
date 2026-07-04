import { NextRequest, NextResponse } from 'next/server';
import { parsePendingCardText } from '@/lib/pendingParse';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 未確定決済情報(VIEW's NET の表をコピーしたTSV)を取り込む。
// 内容ベースIDで upsert するため、同じページを何度貼っても重複しない。
export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase env vars are not configured.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text : '';
  if (!text.trim()) {
    return NextResponse.json({ error: 'text is required.' }, { status: 400 });
  }

  const snapshot = parsePendingCardText('paste', text);
  if (snapshot.transactions.length === 0) {
    return NextResponse.json(
      { error: '取引を1件も読み取れませんでした。VIEW\'s NET の明細表をそのままコピーして貼り付けてください。' },
      { status: 400 },
    );
  }

  const today = todayJst();

  const { data: source, error: sourceError } = await supabase
    .from('ff_sources')
    .insert({
      kind: 'pending_paste',
      label: `未確定貼り付け ${today}`,
      raw_text: text,
    })
    .select('id')
    .single();

  if (sourceError) {
    return NextResponse.json({ error: `原本の保存に失敗: ${sourceError.message}` }, { status: 500 });
  }

  const ids = snapshot.transactions.map(t => t.id);
  const { data: existing } = await supabase
    .from('ff_pending_transactions')
    .select('id')
    .in('id', ids);
  const existingIds = new Set((existing ?? []).map(row => row.id as string));

  const newRows = snapshot.transactions.filter(t => !existingIds.has(t.id));

  if (newRows.length > 0) {
    const { error: insertError } = await supabase.from('ff_pending_transactions').insert(
      newRows.map(t => ({
        id: t.id,
        date: t.date,
        masked_card_number: t.maskedCardNumber,
        card_last4: t.cardLast4,
        merchant: t.merchant,
        amount: t.amount,
        payment_type: t.paymentType,
        currency: t.currency ?? null,
        foreign_amount: t.foreignAmount ?? null,
        exchange_rate: t.exchangeRate ?? null,
        first_seen: today,
        last_seen: today,
        source_id: source.id,
      })),
    );
    if (insertError) {
      return NextResponse.json({ error: `保存に失敗: ${insertError.message}` }, { status: 500 });
    }
  }

  if (existingIds.size > 0) {
    await supabase
      .from('ff_pending_transactions')
      .update({ last_seen: today })
      .in('id', Array.from(existingIds));
  }

  return NextResponse.json({
    parsed: snapshot.transactions.length,
    inserted: newRows.length,
    alreadyKnown: existingIds.size,
  });
}
