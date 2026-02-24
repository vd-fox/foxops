alter table public.handover_batches
  add column if not exists handover_number bigint generated always as identity;

create unique index if not exists handover_batches_handover_number_idx
  on public.handover_batches(handover_number);
