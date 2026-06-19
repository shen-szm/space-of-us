-- Map of Us Supabase setup
-- Run this in Supabase SQL Editor before deploying with Supabase env vars.

create table if not exists public.map_of_us_store (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.map_of_us_store enable row level security;
revoke all on public.map_of_us_store from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('map-of-us', 'map-of-us', false)
on conflict (id) do update set public = false;

drop policy if exists "Map of Us public read" on storage.objects;
