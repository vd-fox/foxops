create or replace function public.get_request_user_id()
returns uuid
language plpgsql
as $$
declare
  sub text;
begin
  begin
    sub := nullif(current_setting('request.jwt.claim.sub', true), '');
  exception when others then
    sub := null;
  end;
  if sub is null then
    return null;
  end if;
  return sub::uuid;
end;
$$;

create table if not exists public.device_history (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table if not exists public.device_flag_history (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  flag_id uuid not null references public.device_flag_definitions(id) on delete cascade,
  old_value boolean,
  new_value boolean,
  old_note text,
  new_note text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create or replace function public.insert_device_history(
  p_device_id uuid,
  p_field text,
  p_old_value text,
  p_new_value text,
  p_user_id uuid
)
returns void
language plpgsql
as $$
begin
  if p_old_value is distinct from p_new_value then
    insert into public.device_history(device_id, field, old_value, new_value, changed_by)
    values (p_device_id, p_field, p_old_value, p_new_value, p_user_id);
  end if;
end;
$$;

create or replace function public.log_device_update()
returns trigger
language plpgsql
as $$
declare
  user_id uuid := public.get_request_user_id();
begin
  if TG_OP = 'UPDATE' then
    perform public.insert_device_history(new.id, 'asset_tag', old.asset_tag, new.asset_tag, user_id);
    perform public.insert_device_history(new.id, 'type', old.type::text, new.type::text, user_id);
    perform public.insert_device_history(new.id, 'description', old.description, new.description, user_id);
    perform public.insert_device_history(new.id, 'status', old.status::text, new.status::text, user_id);
    perform public.insert_device_history(new.id, 'current_holder_id', old.current_holder_id::text, new.current_holder_id::text, user_id);
    perform public.insert_device_history(new.id, 'sim_card_id', old.sim_card_id, new.sim_card_id, user_id);
    perform public.insert_device_history(new.id, 'phone_number', old.phone_number, new.phone_number, user_id);
    perform public.insert_device_history(new.id, 'is_damaged', old.is_damaged::text, new.is_damaged::text, user_id);
    perform public.insert_device_history(new.id, 'damage_note', old.damage_note, new.damage_note, user_id);
    perform public.insert_device_history(new.id, 'is_faulty', old.is_faulty::text, new.is_faulty::text, user_id);
    perform public.insert_device_history(new.id, 'fault_note', old.fault_note, new.fault_note, user_id);
  end if;
  return new;
end;
$$;

create trigger log_device_update_trigger
after update on public.devices
for each row execute function public.log_device_update();

create or replace function public.log_device_flag_change()
returns trigger
language plpgsql
as $$
declare
  user_id uuid := public.get_request_user_id();
  old_val boolean;
  new_val boolean;
  old_note text;
  new_note text;
begin
  if TG_OP = 'DELETE' then
    old_val := old.value;
    old_note := old.note;
    new_val := null;
    new_note := null;
    insert into public.device_flag_history(device_id, flag_id, old_value, new_value, old_note, new_note, changed_by)
    values (old.device_id, old.flag_id, old_val, new_val, old_note, new_note, user_id);
    return old;
  elsif TG_OP = 'INSERT' then
    insert into public.device_flag_history(device_id, flag_id, old_value, new_value, old_note, new_note, changed_by)
    values (new.device_id, new.flag_id, null, new.value, null, new.note, user_id);
    return new;
  else
    old_val := old.value;
    new_val := new.value;
    old_note := old.note;
    new_note := new.note;
    if old_val is distinct from new_val or old_note is distinct from new_note then
      insert into public.device_flag_history(device_id, flag_id, old_value, new_value, old_note, new_note, changed_by)
      values (new.device_id, new.flag_id, old_val, new_val, old_note, new_note, user_id);
    end if;
    return new;
  end if;
end;
$$;

create trigger log_device_flag_change_trigger
after insert or update or delete on public.device_flag_values
for each row execute function public.log_device_flag_change();
