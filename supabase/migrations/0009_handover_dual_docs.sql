alter table public.handover_batches
  add column if not exists issue_document_path text,
  add column if not exists return_document_path text;
