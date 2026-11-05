-- Phinex showroom. Run AFTER schema.sql: Supabase > SQL Editor > New query > paste > Run.
-- Change owner@phinex.com to the same email you used in schema.sql (3 places below plus the storage ones).

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  brand       text check (char_length(brand) <= 60),
  category    text not null default 'phone' check (category in ('phone','tablet')),
  tag         text not null default 'normal' check (tag in ('normal','friday_sale','flash_sale','fast_traders')),
  condition   text check (condition in ('New','UK Used','Refurbished')),
  storage     text check (char_length(storage) <= 40),
  price       numeric(12,2) not null check (price >= 0),
  old_price   numeric(12,2) check (old_price >= 0),
  description text check (char_length(description) <= 300),
  image_url   text,
  in_stock    boolean not null default true,
  published   boolean not null default true,   -- true = visible in the public showroom
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

-- Visitors can only SEE devices the owner has put in the showroom.
drop policy if exists "visitors see showroom" on public.products;
create policy "visitors see showroom" on public.products
  for select to anon, authenticated using (published = true);

-- Only the owner can add, edit, hide and delete.
drop policy if exists "owner manages products" on public.products;
create policy "owner manages products" on public.products
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'owner@phinex.com')
  with check ((auth.jwt() ->> 'email') = 'owner@phinex.com');

-- Photo storage (public bucket, JPG/PNG/WebP, 5MB max)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "owner uploads product photos" on storage.objects;
create policy "owner uploads product photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products' and (auth.jwt() ->> 'email') = 'owner@phinex.com');

drop policy if exists "owner deletes product photos" on storage.objects;
create policy "owner deletes product photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'products' and (auth.jwt() ->> 'email') = 'owner@phinex.com');
