alter table public.handover_batches
  add column if not exists document_path text;
