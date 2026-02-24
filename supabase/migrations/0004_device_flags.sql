alter table public.devices
  add column if not exists sim_card_id text,
  add column if not exists phone_number text,
  add column if not exists is_damaged boolean not null default false,
  add column if not exists damage_note text,
  add column if not exists is_faulty boolean not null default false,
  add column if not exists fault_note text;

create table if not exists public.device_flag_definitions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.device_flag_values (
  device_id uuid not null references public.devices(id) on delete cascade,
  flag_id uuid not null references public.device_flag_definitions(id) on delete cascade,
  value boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (device_id, flag_id)
);

create or replace function public.touch_device_flag_values()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger touch_device_flag_values
before update on public.device_flag_values
for each row execute procedure public.touch_device_flag_values();
