-- Auto-create public.profiles rows whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    coalesce(new.email, concat('user+', new.id, '@local')),
    coalesce((new.raw_user_meta_data->>'full_name'), new.email),
    'DISPATCHER',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill existing auth users without profile entries
insert into public.profiles (id, email, full_name, role, active)
select
  u.id,
  coalesce(u.email, concat('user+', u.id::text, '@local')),
  coalesce(u.raw_user_meta_data->>'full_name', u.email),
  'DISPATCHER',
  true
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
