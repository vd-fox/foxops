alter table public.handover_batches
  add column if not exists courier_signature_path text,
  add column if not exists dispatcher_signature_path text;

update public.handover_batches
set courier_signature_path = coalesce(courier_signature_path, signature_path)
where signature_path is not null;
