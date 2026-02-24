create type public.profile_role as enum ('ADMIN', 'DISPATCHER', 'COURIER');
create type public.device_type as enum ('PDA', 'MOBILE_PRINTER');
create type public.device_status as enum ('AVAILABLE', 'ISSUED', 'LOST', 'BROKEN');
create type public.handover_action as enum ('ISSUE', 'RETURN');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.profile_role not null,
  pin_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  asset_tag text unique not null,
  type public.device_type not null,
  description text,
  status public.device_status not null default 'AVAILABLE',
  current_holder_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.handover_batches (
  id uuid primary key default gen_random_uuid(),
  action_type public.handover_action not null,
  courier_id uuid not null references public.profiles(id),
  dispatcher_id uuid not null references public.profiles(id),
  signature_path text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.handover_logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id),
  from_profile_id uuid references public.profiles(id),
  to_profile_id uuid references public.profiles(id),
  action_type public.handover_action not null,
  timestamp timestamptz not null default now(),
  batch_id uuid not null references public.handover_batches(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger set_devices_updated_at
before update on public.devices
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.handover_batches enable row level security;
alter table public.handover_logs enable row level security;

-- profiles policies
create policy "Profiles view self"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles admin manage"
  on public.profiles
  using (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role = 'ADMIN'
    )
  )
  with check (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role = 'ADMIN'
    )
  );

-- devices policies
create policy "Devices read dispatch"
  on public.devices
  for select
  using (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role in ('ADMIN','DISPATCHER')
    )
  );

create policy "Devices write dispatch"
  on public.devices
  for insert with check (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role in ('ADMIN','DISPATCHER')
    )
  );

create policy "Devices update dispatch"
  on public.devices
  for update using (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role in ('ADMIN','DISPATCHER')
    )
  ) with check (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role in ('ADMIN','DISPATCHER')
    )
  );

-- handover batches and logs policies
create policy "Batches read write dispatch"
  on public.handover_batches
  using (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role in ('ADMIN','DISPATCHER')
    )
  ) with check (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role in ('ADMIN','DISPATCHER')
    )
  );

create policy "Logs read write dispatch"
  on public.handover_logs
  using (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role in ('ADMIN','DISPATCHER')
    )
  ) with check (
    exists (
      select 1 from public.profiles as me
      where me.id = auth.uid() and me.role in ('ADMIN','DISPATCHER')
    )
  );
