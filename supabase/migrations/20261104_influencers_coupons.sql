-- Influenciadores com cupom próprio + vendas atribuídas ao cupom.
create table if not exists public.influencers (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  name text not null,
  phone text not null default '',
  coupon_code text not null,
  discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100),
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_id, coupon_code)
);

create index if not exists influencers_catalog_id_idx on public.influencers (catalog_id);
create index if not exists influencers_coupon_code_idx on public.influencers (catalog_id, coupon_code);

create table if not exists public.coupon_sales (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  influencer_id uuid references public.influencers (id) on delete set null,
  coupon_code text not null,
  customer_name text not null default '',
  customer_phone text not null default '',
  pieces integer not null default 0,
  total numeric(12, 2) not null default 0,
  registered_total numeric(12, 2) not null default 0,
  coupon_discount numeric(12, 2) not null default 0,
  source text not null default 'whatsapp',
  created_at timestamptz not null default now()
);

create index if not exists coupon_sales_catalog_id_idx on public.coupon_sales (catalog_id);
create index if not exists coupon_sales_influencer_id_idx on public.coupon_sales (influencer_id);

alter table public.influencers enable row level security;
alter table public.coupon_sales enable row level security;

drop policy if exists "influencers_select" on public.influencers;
create policy "influencers_select"
  on public.influencers
  for select
  to anon, authenticated
  using (public.can_read_catalog(catalog_id));

drop policy if exists "influencers_insert" on public.influencers;
create policy "influencers_insert"
  on public.influencers
  for insert
  to authenticated
  with check (public.owns_catalog(catalog_id) or public.is_super_admin());

drop policy if exists "influencers_update" on public.influencers;
create policy "influencers_update"
  on public.influencers
  for update
  to authenticated
  using (public.owns_catalog(catalog_id) or public.is_super_admin())
  with check (public.owns_catalog(catalog_id) or public.is_super_admin());

drop policy if exists "influencers_delete" on public.influencers;
create policy "influencers_delete"
  on public.influencers
  for delete
  to authenticated
  using (public.owns_catalog(catalog_id) or public.is_super_admin());

drop policy if exists "coupon_sales_select" on public.coupon_sales;
create policy "coupon_sales_select"
  on public.coupon_sales
  for select
  to authenticated
  using (public.owns_catalog(catalog_id) or public.is_super_admin());

drop policy if exists "coupon_sales_insert" on public.coupon_sales;
create policy "coupon_sales_insert"
  on public.coupon_sales
  for insert
  to authenticated
  with check (public.owns_catalog(catalog_id) or public.is_super_admin());

grant all on public.influencers to authenticated;
grant select on public.influencers to anon;
grant all on public.coupon_sales to authenticated;
