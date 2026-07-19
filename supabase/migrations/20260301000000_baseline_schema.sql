-- ============================================================================
-- BASELINE — snapshot du schéma de production (généré le 2026-06-10)
--
-- Contexte : les tables de base (transactions, categories, …) avaient été
-- créées directement en prod sans migration versionnée. Ce fichier capture
-- leur état réel (colonnes, contraintes, FK, index, RLS, fonctions) tel que
-- lu en production, pour rendre le projet reconstructible.
--
-- Daté AVANT toutes les migrations existantes (la plus ancienne : 20260328) :
-- il ne couvre donc PAS budget_envelopes ni push_subscriptions (créées par
-- leurs propres migrations) ni les colonnes/fonctions ajoutées ensuite
-- (accounting_date, hors_budget, RPC stats… — les migrations 2026032x-2026042x
-- les rejouent de façon idempotente).
--
-- Entièrement idempotent : applicable sur une base vide comme sur la prod.
-- ============================================================================

create extension if not exists "uuid-ossp" with schema extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id          uuid primary key default extensions.uuid_generate_v4(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  icon_key    text not null,
  color       text not null,
  type        text not null check (type = any (array['depense'::text, 'revenu'::text, 'epargne'::text])),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  is_variable boolean not null default false
);

create table if not exists public.subcategories (
  id          uuid primary key default extensions.uuid_generate_v4(),
  category_id uuid not null references public.categories (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  budget      numeric default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  -- Versionnement budget : période de validité au format 'YYYY-MM'
  valid_from  text not null default to_char(now(), 'YYYY-MM'::text),
  valid_to    text,
  envelope    text check (envelope = any (array['needs'::text, 'wants'::text, 'savings'::text]))
);

create table if not exists public.recurring_transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null default ''::text,
  amount            numeric not null,
  type              text not null,
  category          text not null default ''::text,
  categorized       boolean not null default false,
  frequency         text not null default 'monthly'::text
                    check (frequency = any (array['monthly'::text, 'weekly'::text, 'quarterly'::text, 'yearly'::text])),
  day_of_month      smallint,
  start_date        date not null default current_date,
  end_date          date,
  created_at        timestamptz not null default now(),
  accounting_offset text not null default 'same_month'::text
);

create table if not exists public.transactions (
  id                    uuid primary key default extensions.uuid_generate_v4(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  name                  text not null,
  -- Nom de catégorie OU uuid de sous-catégorie sérialisé
  category              text not null default ''::text,
  categorized           boolean not null default false,
  amount                numeric not null,
  date                  timestamptz not null,
  type                  text not null check (type = any (array['depense'::text, 'revenu'::text, 'epargne'::text])),
  status                text not null default 'pending'::text
                        check (status = any (array['checked'::text, 'pending'::text])),
  created_at            timestamptz not null default now(),
  recurring_id          uuid references public.recurring_transactions (id) on delete set null,
  note                  text,
  recurrence_occurrence text,
  accounting_date       date,
  hors_budget           boolean not null default false
);

create table if not exists public.user_preferences (
  user_id                     uuid primary key references auth.users (id) on delete cascade,
  theme                       text not null default 'system'::text,
  currency                    text not null default 'EUR'::text,
  locale                      text not null default 'fr'::text,
  updated_at                  timestamptz not null default now(),
  onboarding_completed        boolean not null default false,
  budget_repartition_enabled  boolean not null default false,
  envelope_feature_enabled    boolean not null default false,
  notification_prefs          jsonb,
  accounting_period_start_day smallint not null default 1
                              check (accounting_period_start_day >= 1 and accounting_period_start_day <= 31)
);

create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  -- NB : seule FK user sans cascade en prod
  user_id     uuid not null references auth.users (id),
  name        text not null,
  amount      numeric not null,
  type        text not null,
  category    text not null default ''::text,
  subcategory text not null default ''::text,
  "position"  integer not null default 0,
  created_at  timestamptz default now()
);

create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  target_amount  numeric not null default 0,
  start_amount   numeric not null default 0,
  subcategory_id uuid references public.subcategories (id) on delete set null,
  color          text not null default '#60a5fa'::text,
  created_at     timestamptz not null default now()
);

create table if not exists public.user_api_keys (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  key_hash   text not null unique,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- INDEX
-- ────────────────────────────────────────────────────────────────────────────

create index if not exists idx_categories_user_id    on public.categories (user_id);
create index if not exists idx_subcategories_cat_id  on public.subcategories (category_id);
create index if not exists idx_subcategories_user_id on public.subcategories (user_id);
create index if not exists idx_subcategories_valid   on public.subcategories (valid_from, valid_to);
create index if not exists idx_transactions_user_id  on public.transactions (user_id);
create index if not exists idx_transactions_date     on public.transactions (user_id, date desc);
create index if not exists idx_transactions_type     on public.transactions (user_id, type);
create index if not exists favorites_user_position   on public.favorites (user_id, "position");

-- ────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────────────────

alter table public.categories             enable row level security;
alter table public.subcategories          enable row level security;
alter table public.transactions           enable row level security;
alter table public.user_preferences       enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.favorites              enable row level security;
alter table public.savings_goals          enable row level security;
alter table public.user_api_keys          enable row level security;

drop policy if exists "users manage own categories" on public.categories;
create policy "users manage own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users manage own subcategories" on public.subcategories;
create policy "users manage own subcategories" on public.subcategories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users manage own transactions" on public.transactions;
create policy "users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own recurring transactions" on public.recurring_transactions;
create policy "Users can manage own recurring transactions" on public.recurring_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own favorites" on public.favorites;
create policy "Users can manage their own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "savings_goals_user_policy" on public.savings_goals;
create policy "savings_goals_user_policy" on public.savings_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users can manage their own API keys" on public.user_api_keys;
create policy "Users can manage their own API keys" on public.user_api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- FONCTIONS (état prod verbatim — fonctions absentes des migrations existantes)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.get_budget_totals()
 returns table(type text, total_budget numeric)
 language sql
 stable
as $function$
  SELECT
    c.type,
    COALESCE(SUM(s.budget), 0)::numeric AS total_budget
  FROM categories c
  LEFT JOIN subcategories s ON s.category_id = c.id AND s.valid_to IS NULL
  GROUP BY c.type
$function$;

create or replace function public.get_category_budgets()
 returns table(id uuid, total_budget numeric)
 language sql
 stable
as $function$
  SELECT
    c.id,
    COALESCE(SUM(s.budget), 0)::numeric AS total_budget
  FROM categories c
  LEFT JOIN subcategories s ON s.category_id = c.id AND s.valid_to IS NULL
  GROUP BY c.id
$function$;

create or replace function public.get_label_suggestions(p_query text, p_limit integer default 2)
 returns table(label text, type text, category text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  WITH matches AS (
    SELECT
      name,
      type,
      category,
      COUNT(*) AS name_freq
    FROM transactions
    WHERE
      user_id = auth.uid()
      AND categorized = true
      AND name ILIKE '%' || p_query || '%'
    GROUP BY name, type, category
  ),
  cat_freq AS (
    SELECT category, type, SUM(name_freq) AS total
    FROM matches
    GROUP BY category, type
  ),
  best_label AS (
    SELECT DISTINCT ON (m.category)
      m.name     AS label,
      m.type,
      m.category AS raw_category,
      cf.total
    FROM matches m
    JOIN cat_freq cf ON cf.category = m.category AND cf.type = m.type
    ORDER BY m.category, m.name_freq DESC
  )
  SELECT
    bl.label,
    bl.type,
    COALESCE(s.name, bl.raw_category) AS category
  FROM best_label bl
  LEFT JOIN subcategories s ON s.id::text = bl.raw_category AND s.valid_to IS NULL
  ORDER BY bl.total DESC
  LIMIT p_limit
$function$;

create or replace function public.get_category_suggestions_bulk(p_names text[])
 returns table(input_name text, subcategory_id uuid, category_name text, type text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  WITH name_list AS (
    SELECT DISTINCT unnest(p_names) AS query_name
  ),
  matches AS (
    SELECT
      nl.query_name,
      t.category,
      t.type,
      COUNT(*) AS freq
    FROM name_list nl
    JOIN transactions t ON
      t.user_id     = auth.uid()
      AND t.categorized = true
      AND t.name    ILIKE '%' || nl.query_name || '%'
      AND t.category ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    GROUP BY nl.query_name, t.category, t.type
  ),
  best_per_name AS (
    SELECT DISTINCT ON (query_name)
      query_name,
      category,
      type
    FROM matches
    ORDER BY query_name, freq DESC
  )
  SELECT
    b.query_name AS input_name,
    s.id         AS subcategory_id,
    s.name       AS category_name,
    b.type
  FROM best_per_name b
  JOIN subcategories s ON s.id::text = b.category AND s.valid_to IS NULL
$function$;

create or replace function public.get_savings_goal_history(p_goal_id uuid)
 returns table(tx_date date, cumulative numeric)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  SELECT
    t.date::date AS tx_date,
    g.start_amount + SUM(ABS(t.amount)) OVER (ORDER BY t.date::date, t.created_at) AS cumulative
  FROM savings_goals g
  JOIN transactions t
    ON  t.type        = 'epargne'
    AND t.categorized = true
    AND g.subcategory_id IS NOT NULL
    AND t.category    = g.subcategory_id::text
    AND t.user_id     = g.user_id
  WHERE g.id      = p_goal_id
    AND g.user_id = auth.uid()
  ORDER BY t.date::date, t.created_at
$function$;

create or replace function public.get_savings_goals_progress()
 returns table(goal_id uuid, total_saved numeric)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  SELECT
    g.id AS goal_id,
    g.start_amount + COALESCE(SUM(ABS(t.amount)), 0) AS total_saved
  FROM savings_goals g
  LEFT JOIN transactions t
    ON  t.type        = 'epargne'
    AND t.categorized = true
    AND g.subcategory_id IS NOT NULL
    AND t.category    = g.subcategory_id::text
    AND t.user_id     = g.user_id
  WHERE g.user_id = auth.uid()
  GROUP BY g.id, g.start_amount
$function$;

create or replace function public.reset_account_data()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM transactions           WHERE user_id = auth.uid();
  DELETE FROM recurring_transactions WHERE user_id = auth.uid();
  DELETE FROM budget_envelopes       WHERE user_id = auth.uid();
  DELETE FROM favorites              WHERE user_id = auth.uid();
  DELETE FROM savings_goals          WHERE user_id = auth.uid();
  DELETE FROM user_api_keys          WHERE user_id = auth.uid();
  DELETE FROM categories             WHERE user_id = auth.uid();
END;
$function$;

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTS ROLES API
-- Modèle Supabase : accès au niveau table pour anon/authenticated/service_role,
-- la sécurité par ligne étant assurée par la RLS ci-dessus. En prod ces grants
-- sont posés automatiquement par la plateforme ; on les rend explicites pour que
-- `supabase db start` (CI / local) reproduise exactement le même accès.
-- ────────────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- Tables/séquences créées par les migrations ultérieures héritent des mêmes grants
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
