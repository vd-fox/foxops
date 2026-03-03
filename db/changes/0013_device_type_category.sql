alter table public.device_type_definitions
  add column if not exists category device_type;

update public.device_type_definitions
set category = 'PDA'
where name in ('TC26', 'TC27', 'TC51', 'TC57');

update public.device_type_definitions
set category = 'MOBILE_PRINTER'
where name = 'ZQ521';

insert into public.device_type_definitions (name, category)
values ('ZQ521', 'MOBILE_PRINTER')
on conflict (name) do update
set category = excluded.category;

update public.device_type_definitions
set category = 'PDA'
where category is null;

alter table public.device_type_definitions
  alter column category set not null;
