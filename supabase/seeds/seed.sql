-- Replace the UUID values with the auth.users IDs created through Supabase Auth.
insert into public.profiles (id, email, full_name, role, active)
values
  ('00000000-0000-0000-0000-000000000001', 'alice.admin@foxchange.test', 'Alice Admin', 'ADMIN', true)
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, role = excluded.role, active = excluded.active;

insert into public.profiles (id, email, full_name, role, active)
values
  ('00000000-0000-0000-0000-000000000002', 'derek.admin@foxchange.test', 'Derek Admin', 'ADMIN', true),
  ('00000000-0000-0000-0000-000000000003', 'nina.admin@foxchange.test', 'Nina Admin', 'ADMIN', true)
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, role = excluded.role, active = excluded.active;

insert into public.profiles (id, email, full_name, role, active, pin_hash)
values
  ('00000000-0000-0000-0000-000000000101', 'courier.1111@foxchange.test', 'Courier 1111', 'COURIER', true, '$2y$12$WNINR789p3BAWsgk9sEDKOTusWdNubxBoVG0QO27aLwhX0sTSl4RS'),
  ('00000000-0000-0000-0000-000000000102', 'courier.2222@foxchange.test', 'Courier 2222', 'COURIER', true, '$2y$12$5yjtpTIP2zPcVwwAK55NyOsCenmHkwn9N47Q0pt1Oo3KmrLJZq2om'),
  ('00000000-0000-0000-0000-000000000103', 'courier.3333@foxchange.test', 'Courier 3333', 'COURIER', true, '$2y$12$TdNsR3h/8XADuaNAsQjKDeCtiC59eR9GvMfA3PgRlQVXzvMRdMclm'),
  ('00000000-0000-0000-0000-000000000104', 'courier.4444@foxchange.test', 'Courier 4444', 'COURIER', true, '$2y$12$ES.p1V4A5bLPzDlBL6AYmeGv0IfY1X9PGeifY4yyEOyOWtoHoGUfG'),
  ('00000000-0000-0000-0000-000000000105', 'courier.5555@foxchange.test', 'Courier 5555', 'COURIER', true, '$2y$12$zsurKTfzNi3hq1E4uuAzPOhzNbf9RsjuWMsXTpkEoV5HtoWyBQwM2'),
  ('00000000-0000-0000-0000-000000000106', 'courier.6666@foxchange.test', 'Courier 6666', 'COURIER', true, '$2y$12$ds9nvhztgIRPIOnIQ7ECNecAOjHs1Y0oCIh2C4shizoYKKXetJWIO'),
  ('00000000-0000-0000-0000-000000000107', 'courier.7777@foxchange.test', 'Courier 7777', 'COURIER', true, '$2y$12$WmYPyJZ8jqTaU8xmckxh6ex./P5MZkXt2lwdLv42CWLbN01YxQOAG'),
  ('00000000-0000-0000-0000-000000000108', 'courier.8888@foxchange.test', 'Courier 8888', 'COURIER', true, '$2y$12$hrTue40FlC.jh9OqB7Vtx.ZwhW4m9.PY.SqOQEuVinNnG0zUEHJo.'),
  ('00000000-0000-0000-0000-000000000109', 'courier.9999@foxchange.test', 'Courier 9999', 'COURIER', true, '$2y$12$ffOv8.ftz3A9gW3BVWQsj.7MWZgexb0AJOtNZaFHiENZ.fL17VWNC')
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, pin_hash = excluded.pin_hash, active = excluded.active;

insert into public.devices (asset_tag, type, description)
select concat('PDA-', lpad(seq::text, 4, '0')), 'PDA', 'Standard courier PDA'
from generate_series(1, 20) as seq
on conflict (asset_tag) do nothing;

insert into public.devices (asset_tag, type, description)
select concat('PRN-', lpad(seq::text, 4, '0')), 'MOBILE_PRINTER', 'Thermal label printer'
from generate_series(1, 10) as seq
on conflict (asset_tag) do nothing;
