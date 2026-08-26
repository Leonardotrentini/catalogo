-- Vesto Catálogo — schema inicial
create extension if not exists "pgcrypto";

create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand jsonb not null default '{}'::jsonb,
  colors jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigserial primary key,
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  name text not null,
  category text not null default '',
  qty integer not null default 0,
  sizes text[] not null default '{}',
  price text not null default '',
  colors text[] not null default '{}',
  images jsonb not null default '[]'::jsonb,
  videos jsonb not null default '[]'::jsonb,
  description text not null default '',
  cover_type text check (cover_type is null or cover_type in ('video', 'image')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_catalog_id_idx on public.products (catalog_id);
create index if not exists products_sort_order_idx on public.products (catalog_id, sort_order);

alter table public.catalogs enable row level security;
alter table public.products enable row level security;

drop policy if exists "catalogs_anon_all" on public.catalogs;
create policy "catalogs_anon_all"
  on public.catalogs
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "products_anon_all" on public.products;
create policy "products_anon_all"
  on public.products
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant all on public.catalogs to anon, authenticated;
grant all on public.products to anon, authenticated;
grant usage, select on sequence public.products_id_seq to anon, authenticated;

insert into public.catalogs (slug, brand, colors)
values (
  'default',
  '{"name":"","logo":"","banner":"","videoUrl":"","whatsapp":"","instagram":"","cnpj":""}'::jsonb,
  '{"primary":"#0A1F18","accent":"#C9A84C","text":"#ffffff","card":"#122E23"}'::jsonb
)
on conflict (slug) do nothing;
