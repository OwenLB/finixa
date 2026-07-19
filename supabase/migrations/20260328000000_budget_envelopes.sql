-- Table de configuration des enveloppes budgétaires (règle 50/30/20)
create table if not exists public.budget_envelopes (
  user_id     uuid references auth.users(id) on delete cascade primary key,
  needs_pct   integer not null default 50 check (needs_pct  between 0 and 100),
  wants_pct   integer not null default 30 check (wants_pct  between 0 and 100),
  savings_pct integer not null default 20 check (savings_pct between 0 and 100),
  updated_at  timestamptz not null default now()
);

alter table public.budget_envelopes enable row level security;

create policy "users can manage own envelope"
  on public.budget_envelopes
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
