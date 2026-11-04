-- Phinex database. Run this once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists public.requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name)    between 1 and 100),
  phone      text not null check (char_length(phone)   between 5 and 30),
  message    text not null check (char_length(message) between 1 and 1000),
  status     text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

alter table public.requests enable row level security;

-- Visitors (anon key) can only SEND a request. They cannot read, edit or delete anything.
drop policy if exists "visitors can send requests" on public.requests;
create policy "visitors can send requests"
  on public.requests for insert to anon
  with check (status = 'new');

-- Only the owner can read, update and delete. CHANGE THE EMAIL to the one you use to log in to admin.html.
drop policy if exists "owner manages requests" on public.requests;
create policy "owner manages requests"
  on public.requests for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'owner@phinex.com')
  with check ((auth.jwt() ->> 'email') = 'owner@phinex.com');
