create table if not exists public.site_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone not null default now()
);

alter table public.profiles
  add column if not exists site_id uuid references public.site_definitions(id);

insert into public.site_definitions (name)
values
  ('Maglód'),
  ('Fót'),
  ('Lurdy'),
  ('Alsózsolca'),
  ('Debrecen'),
  ('Szeged'),
  ('Pécs Packeta'),
  ('Pécs Foxpost'),
  ('Zalaegerszeg'),
  ('Győr Packeta'),
  ('Győr Foxpost'),
  ('Székesfehérvár')
on conflict (name) do nothing;
