do $$
begin
  if not exists (select 1 from pg_type where typname = 'courier_type') then
    create type courier_type as enum ('CONTRACTOR', 'EMPLOYEE');
  end if;
end
$$;

alter table public.profiles
  add column if not exists courier_type courier_type,
  add column if not exists company_name text,
  add column if not exists vat_number text,
  add column if not exists company_number text,
  add column if not exists representative_first_name text,
  add column if not exists representative_last_name text,
  add column if not exists representative_email text,
  add column if not exists representative_phone text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists employee_email text,
  add column if not exists employee_phone text,
  add column if not exists employee_id text,
  add column if not exists position text;
