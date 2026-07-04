import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  EXTRACTION_SCHEMA,
  EXTRACTION_SYSTEM,
  ExtractionResult,
  verifyExtraction,
} from '@/lib/bankExtract';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 価格バランス重視の既定モデル。OPENAI_MODEL で差し替え可能。
const DEFAULT_MODEL = 'gpt-5-mini';

const MEDIA_TYPES: Record<string, 'image/png' | 'image/jpeg' | 'image/webp'> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

// Step 2 of the pipeline: bank screenshots -> LLM draft -> balance-chain verify.
// Does NOT persist anything; the reviewed draft is committed via /api/ingest/bank/commit.
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY が未設定です。.env.local と Vercel に登録してください。' },
      { status: 500 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll('files').filter((f): f is File => f instanceof File) ?? [];
  if (files.length === 0) {
    return NextResponse.json({ error: 'スクリーンショットを1枚以上添付してください。' }, { status: 400 });
  }

  const imageParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mediaType = MEDIA_TYPES[ext] ?? (file.type as 'image/png') ?? 'image/png';
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:${mediaType};base64,${base64}` },
    });
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  let result: ExtractionResult;
  try {
    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: 16000,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '添付の銀行明細スクリーンショットから、写っている取引をすべて構造化データにしてください。複数枚ある場合は時系列につなげてください。',
            },
            ...imageParts,
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'bank_extraction', strict: true, schema: EXTRACTION_SCHEMA },
      },
    });

    const choice = response.choices[0];
    if (choice?.message.refusal) {
      return NextResponse.json({ error: `モデルが読み取りを拒否しました: ${choice.message.refusal}` }, { status: 422 });
    }
    const jsonText = choice?.message.content ?? '';
    if (!jsonText) {
      return NextResponse.json({ error: 'モデルが空の応答を返しました。もう一度お試しください。' }, { status: 502 });
    }
    result = JSON.parse(jsonText) as ExtractionResult;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `抽出に失敗しました: ${message}` }, { status: 502 });
  }

  const report = verifyExtraction(result);
  return NextResponse.json(report);
}
