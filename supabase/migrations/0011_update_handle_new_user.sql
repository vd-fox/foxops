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
    'ADMIN',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
