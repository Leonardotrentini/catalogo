-- Null = estoque antigo (só products.qty). Array = unidades por cor e tamanho.
alter table public.products
  add column if not exists stock jsonb;
