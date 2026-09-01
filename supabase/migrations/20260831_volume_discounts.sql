alter table public.products
  add column if not exists volume_discounts jsonb not null default '[]'::jsonb;
