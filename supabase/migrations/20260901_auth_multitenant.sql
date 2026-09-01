-- Auth multitenant: profiles, owner_id, RLS restritivo

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'tenant' check (role in ('super_admin', 'tenant')),
  catalog_slug text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalogs
  add column if not exists owner_id uuid references auth.users (id) on delete set null;

create index if not exists catalogs_owner_id_idx on public.catalogs (owner_id);
create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and is_active = true
  );
$$;

create or replace function public.owns_catalog(catalog uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.catalogs
    where id = catalog
      and owner_id = auth.uid()
  );
$$;

create or replace function public.can_read_catalog(catalog uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.catalogs c
    where c.id = catalog
      and (
        c.is_published = true
        or c.owner_id = auth.uid()
        or public.is_super_admin()
      )
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

drop policy if exists "catalogs_anon_all" on public.catalogs;

drop policy if exists "catalogs_select" on public.catalogs;
create policy "catalogs_select"
  on public.catalogs
  for select
  to anon, authenticated
  using (
    is_published = true
    or owner_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists "catalogs_insert" on public.catalogs;
create policy "catalogs_insert"
  on public.catalogs
  for insert
  to authenticated
  with check (owner_id = auth.uid() or public.is_super_admin());

drop policy if exists "catalogs_update" on public.catalogs;
create policy "catalogs_update"
  on public.catalogs
  for update
  to authenticated
  using (owner_id = auth.uid() or public.is_super_admin())
  with check (owner_id = auth.uid() or public.is_super_admin());

drop policy if exists "catalogs_delete" on public.catalogs;
create policy "catalogs_delete"
  on public.catalogs
  for delete
  to authenticated
  using (owner_id = auth.uid() or public.is_super_admin());

drop policy if exists "products_anon_all" on public.products;

drop policy if exists "products_select" on public.products;
create policy "products_select"
  on public.products
  for select
  to anon, authenticated
  using (public.can_read_catalog(catalog_id));

drop policy if exists "products_insert" on public.products;
create policy "products_insert"
  on public.products
  for insert
  to authenticated
  with check (public.owns_catalog(catalog_id) or public.is_super_admin());

drop policy if exists "products_update" on public.products;
create policy "products_update"
  on public.products
  for update
  to authenticated
  using (public.owns_catalog(catalog_id) or public.is_super_admin())
  with check (public.owns_catalog(catalog_id) or public.is_super_admin());

drop policy if exists "products_delete" on public.products;
create policy "products_delete"
  on public.products
  for delete
  to authenticated
  using (public.owns_catalog(catalog_id) or public.is_super_admin());

grant all on public.profiles to authenticated;
grant select on public.profiles to anon;
