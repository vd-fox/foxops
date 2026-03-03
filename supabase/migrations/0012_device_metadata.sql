create table if not exists public.device_type_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.device_supplier_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone not null default now()
);

alter table public.devices
  add column if not exists serial_number text,
  add column if not exists device_type_id uuid references public.device_type_definitions(id),
  add column if not exists insurance boolean not null default false,
  add column if not exists insurance_valid_until date,
  add column if not exists tss boolean not null default false,
  add column if not exists tss_valid_until date,
  add column if not exists supplier_id uuid references public.device_supplier_definitions(id);

insert into public.device_type_definitions (name)
values
  ('TC51'),
  ('TC57'),
  ('TC26'),
  ('TC27')
on conflict (name) do nothing;

insert into public.device_supplier_definitions (name)
values
  ('Koddy'),
  ('Intelflow')
on conflict (name) do nothing;
