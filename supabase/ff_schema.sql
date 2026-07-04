-- family-finance v2: ingest ledger schema
-- Supabase Dashboard > SQL Editor で1回実行してください。
-- 既存の familybudget_* テーブルには影響しません。

-- 1) 原本(アップロードされたスクショ / 貼り付けテキスト / CSV)
create table if not exists public.ff_sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bank_screenshot', 'pending_paste', 'card_csv')),
  label text,
  raw_text text,
  storage_paths text[],
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2) 銀行取引(確定台帳) — data/transactions.json と同じ構造
create table if not exists public.ff_bank_transactions (
  id text primary key,
  date date not null,
  account text not null check (account in ('mufg', 'resona', 'yucho_daughter', 'yucho_son')),
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount integer not null,
  description text not null default '',
  category text not null,
  note text not null default '',
  balance_after integer,
  source_id uuid references public.ff_sources(id),
  created_at timestamptz not null default now()
);

-- 3) 確定カード明細(statement 単位) — data/card_transactions.json と同じ構造
create table if not exists public.ff_card_statements (
  id uuid primary key default gen_random_uuid(),
  file text not null unique,
  card text not null check (card in ('view', 'lumine')),
  card_label text not null,
  payment_date text not null default '',
  payment_yyyymm text not null default '',
  total integer not null default 0,
  source_id uuid references public.ff_sources(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ff_card_transactions (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.ff_card_statements(id) on delete cascade,
  date text not null,
  shop text not null default '',
  amount integer not null default 0,
  refund integer not null default 0,
  this_charge integer not null default 0,
  net integer not null default 0,
  pay_type text not null default '',
  person text not null default ''
);

create index if not exists ff_card_transactions_statement_idx
  on public.ff_card_transactions (statement_id);

-- 4) 未確定カード決済(スナップショット横断でマージ済みの行)
--    id は内容ベース(日付-カード-店舗-金額-出現順)で、再取込しても重複しない
create table if not exists public.ff_pending_transactions (
  id text primary key,
  date date not null,
  masked_card_number text not null default '',
  card_last4 text not null default '----',
  merchant text not null default '',
  amount integer not null default 0,
  payment_type text not null default '',
  currency text,
  foreign_amount numeric,
  exchange_rate numeric,
  first_seen date,
  last_seen date,
  source_id uuid references public.ff_sources(id),
  created_at timestamptz not null default now()
);

-- RLS: 現行アプリと同じ信頼モデル(家族内利用・anon キー)。
-- 将来 Supabase Auth を入れる際にポリシーを絞る。
alter table public.ff_sources enable row level security;
alter table public.ff_bank_transactions enable row level security;
alter table public.ff_card_statements enable row level security;
alter table public.ff_card_transactions enable row level security;
alter table public.ff_pending_transactions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ff_sources', 'ff_bank_transactions', 'ff_card_statements',
    'ff_card_transactions', 'ff_pending_transactions'
  ] loop
    execute format(
      'drop policy if exists "%s_anon_all" on public.%I', t, t
    );
    execute format(
      'create policy "%s_anon_all" on public.%I for all to anon, authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- 5) スクショ原本用 Storage バケット(非公開)
insert into storage.buckets (id, name, public)
values ('ff-sources', 'ff-sources', false)
on conflict (id) do nothing;

drop policy if exists "ff_sources_anon_insert" on storage.objects;
create policy "ff_sources_anon_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'ff-sources');

drop policy if exists "ff_sources_anon_select" on storage.objects;
create policy "ff_sources_anon_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'ff-sources');
