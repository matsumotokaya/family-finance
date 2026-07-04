import { NextRequest, NextResponse } from 'next/server';
import { parseCardStatementCsv } from '@/lib/cardCsv';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// 確定カード明細CSV(Shift-JIS)を取り込む。
// 同名ファイルの再アップロードは statement ごと差し替える。
export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase env vars are not configured.' }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required.' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const content = new TextDecoder('shift-jis').decode(buffer);
  const statement = parseCardStatementCsv(content, file.name);

  if (statement.transactions.length === 0) {
    return NextResponse.json(
      { error: '明細行を読み取れませんでした。VIEW\'s NET からダウンロードしたCSVか確認してください。' },
      { status: 400 },
    );
  }

  const { data: source, error: sourceError } = await supabase
    .from('ff_sources')
    .insert({ kind: 'card_csv', label: file.name, raw_text: content })
    .select('id')
    .single();
  if (sourceError) {
    return NextResponse.json({ error: `原本の保存に失敗: ${sourceError.message}` }, { status: 500 });
  }

  // 同名ファイルは差し替え(明細は on delete cascade で消える)
  const { data: existing } = await supabase
    .from('ff_card_statements')
    .select('id')
    .eq('file', statement.file)
    .maybeSingle();
  const replaced = Boolean(existing);
  if (existing) {
    await supabase.from('ff_card_statements').delete().eq('id', existing.id);
  }

  const { data: inserted, error: statementError } = await supabase
    .from('ff_card_statements')
    .insert({
      file: statement.file,
      card: statement.card,
      card_label: statement.card_label,
      payment_date: statement.payment_date,
      payment_yyyymm: statement.payment_yyyymm,
      total: statement.total,
      source_id: source.id,
    })
    .select('id')
    .single();
  if (statementError) {
    return NextResponse.json({ error: `保存に失敗: ${statementError.message}` }, { status: 500 });
  }

  const { error: txError } = await supabase.from('ff_card_transactions').insert(
    statement.transactions.map(t => ({ statement_id: inserted.id, ...t })),
  );
  if (txError) {
    return NextResponse.json({ error: `明細の保存に失敗: ${txError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    file: statement.file,
    card_label: statement.card_label,
    payment_yyyymm: statement.payment_yyyymm,
    total: statement.total,
    transactionCount: statement.transactions.length,
    replaced,
  });
}
