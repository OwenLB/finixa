-- ============================================================================
-- Identité stable des sous-catégories + historique de budget séparé.
--
-- Avant : chaque changement de budget créait une nouvelle ligne de sous-catégorie
-- (nouvel id). Les transactions référencent la sous-catégorie par id → elles
-- devenaient orphelines. De plus valid_from/valid_to (fenêtre de budget)
-- conditionnait la CATÉGORISATION → toute transaction antérieure apparaissait
-- décatégorisée.
--
-- Après :
--   * subcategories = IDENTITÉ stable (id immuable ; soft-delete via archived_at).
--   * subcategory_budgets = HISTORIQUE du budget par mois (effective_from).
--   * Attribution d'une transaction = par id SEUL (aucune fenêtre).
--   * Budget d'un mois = dernière version dont effective_from <= ce mois.
--
-- Les colonnes valid_from / valid_to / budget de subcategories sont conservées
-- (vestigiales) pour éviter tout drop risqué ; aucune fonction ne les lit plus.
-- ============================================================================

-- 1. Historique de budget ---------------------------------------------------
create table if not exists subcategory_budgets (
  subcategory_id uuid    not null references subcategories(id) on delete cascade,
  effective_from text    not null,                 -- 'YYYY-MM'
  budget         numeric,                          -- null = suivi sans budget
  primary key (subcategory_id, effective_from)
);

alter table subcategory_budgets enable row level security;

drop policy if exists "subcategory_budgets_owner" on subcategory_budgets;
create policy "subcategory_budgets_owner" on subcategory_budgets
  for all
  using      (exists (select 1 from subcategories s where s.id = subcategory_id and s.user_id = auth.uid()))
  with check (exists (select 1 from subcategories s where s.id = subcategory_id and s.user_id = auth.uid()));

-- 2. Soft-delete sur l'identité --------------------------------------------
alter table subcategories add column if not exists archived_at timestamptz;

-- 3. Repli des versions existantes -----------------------------------------
-- Canonique = ligne courante (valid_to IS NULL) de chaque (user, catégorie, nom).
-- Les versions partagent toujours le même nom (le rename ne crée pas de version).
create temporary table _canon on commit drop as
select s.id,
       first_value(s.id) over (
         partition by s.user_id, s.category_id, s.name
         order by (s.valid_to is null) desc, s.valid_from desc, s.id
       ) as canonical_id
from subcategories s;

-- Repointe transactions et cagnottes des anciennes versions vers le canonique
update transactions t set category = c.canonical_id::text
from _canon c where t.category = c.id::text and c.id <> c.canonical_id;

update savings_goals g set subcategory_id = c.canonical_id
from _canon c where g.subcategory_id = c.id and c.id <> c.canonical_id;

-- Reconstruit l'historique de budget sous l'id canonique (1 budget / mois)
insert into subcategory_budgets (subcategory_id, effective_from, budget)
select distinct on (c.canonical_id, s.valid_from)
       c.canonical_id, s.valid_from, s.budget
from subcategories s
join _canon c on c.id = s.id
where s.budget is not null
order by c.canonical_id, s.valid_from, (s.valid_to is null) desc, s.id
on conflict (subcategory_id, effective_from) do nothing;

-- Archive (soft-delete) les anciennes versions
update subcategories s set archived_at = now()
from _canon c where c.id = s.id and c.id <> c.canonical_id;

-- 4. Helpers de lecture du budget ------------------------------------------
create or replace function public.subcategory_budget_at(p_sub uuid, p_month text)
returns numeric language sql stable set search_path to 'public' as $$
  select b.budget
  from subcategory_budgets b
  where b.subcategory_id = p_sub and b.effective_from <= p_month
  order by b.effective_from desc
  limit 1
$$;

create or replace function public.get_subcategory_budgets(p_month text)
returns table(subcategory_id uuid, budget numeric)
language sql stable set search_path to 'public' as $$
  select distinct on (b.subcategory_id) b.subcategory_id, b.budget
  from subcategory_budgets b
  where b.effective_from <= p_month
  order by b.subcategory_id, b.effective_from desc
$$;

-- 5. Réécriture des fonctions ----------------------------------------------
-- Principe : attribution par id (s.id::text = t.category) sans fenêtre ;
-- budget du mois via subcategory_budget_at ; listing des sous-cat non archivées.

create or replace function public.get_budget_totals()
returns table(type text, total_budget numeric)
language sql stable set search_path to 'public' as $$
  select c.type,
         coalesce(sum(subcategory_budget_at(s.id, to_char(current_date,'YYYY-MM'))), 0)::numeric
  from categories c
  left join subcategories s on s.category_id = c.id and s.archived_at is null
  group by c.type
$$;

create or replace function public.get_category_budgets()
returns table(id uuid, total_budget numeric)
language sql stable set search_path to 'public' as $$
  select c.id,
         coalesce(sum(subcategory_budget_at(s.id, to_char(current_date,'YYYY-MM'))), 0)::numeric
  from categories c
  left join subcategories s on s.category_id = c.id and s.archived_at is null
  group by c.id
$$;

create or replace function public.get_subcategory_stats(p_month text, p_start date default null, p_end date default null)
returns table(subcategory_id uuid, spent numeric, tx_count bigint)
language sql set search_path to 'public' as $$
  with v as (
    select coalesce(p_start, (p_month || '-01')::date) as v_start,
           coalesce(p_end,   (p_month || '-01')::date + interval '1 month')::date as v_end
  ),
  all_tx as (
    select amount, type, category, categorized from transactions, v
    where coalesce(accounting_date, date::date) >= v.v_start
      and coalesce(accounting_date, date::date) <  v.v_end
      and hors_budget = false
    union all
    select amount, type, category, categorized
    from v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
  )
  select s.id,
         coalesce(sum(abs(t.amount)), 0)::numeric,
         count(t.amount)::bigint
  from subcategories s
  join categories c on c.id = s.category_id
  left join all_tx t on t.type = c.type and t.categorized = true and s.id::text = t.category
  where s.archived_at is null
  group by s.id
$$;

create or replace function public.get_category_spent(p_month text, p_start date default null, p_end date default null)
returns table(category_id uuid, total_spent numeric, direct_spent numeric, direct_count bigint)
language sql set search_path to 'public' as $$
  with v as (
    select coalesce(p_start, (p_month || '-01')::date) as v_start,
           coalesce(p_end,   (p_month || '-01')::date + interval '1 month')::date as v_end
  ),
  all_tx as (
    select amount, type, category, categorized from transactions, v
    where coalesce(accounting_date, date::date) >= v.v_start
      and coalesce(accounting_date, date::date) <  v.v_end
      and hors_budget = false
    union all
    select amount, type, category, categorized
    from v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
  )
  select c.id,
    coalesce(sum(abs(t.amount)), 0)::numeric,
    coalesce(sum(case when sn.id is null then abs(t.amount) else 0 end), 0)::numeric,
    count(case when sn.id is null then 1 end)::bigint
  from categories c
  left join all_tx t on
    t.type = c.type and t.categorized = true and (
      t.category = c.name
      or exists (select 1 from subcategories sx where sx.category_id = c.id and sx.id::text = t.category)
    )
  left join subcategories sn on sn.category_id = c.id and sn.id::text = t.category
  group by c.id
$$;

create or replace function public.get_envelope_stats(p_month text, p_start date default null, p_end date default null)
returns table(envelope text, spent numeric, tx_count bigint)
language sql set search_path to 'public' as $$
  with v as (
    select coalesce(p_start, (p_month || '-01')::date) as v_start,
           coalesce(p_end,   (p_month || '-01')::date + interval '1 month')::date as v_end
  ),
  all_tx as (
    select amount, type, category, categorized from transactions, v
    where coalesce(accounting_date, date::date) >= v.v_start
      and coalesce(accounting_date, date::date) <  v.v_end
      and hors_budget = false
    union all
    select amount, type, category, categorized
    from v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
  )
  select s.envelope,
         coalesce(sum(abs(t.amount)), 0)::numeric,
         count(t.amount)::bigint
  from subcategories s
  join categories c on c.id = s.category_id
  join all_tx t on t.type = c.type and t.categorized = true and s.id::text = t.category
  where s.envelope is not null and s.archived_at is null
  group by s.envelope
$$;

create or replace function public.get_variable_daily_remaining(p_month text, p_start date default null, p_end date default null)
returns table(variable_budget numeric, variable_spent numeric, remaining numeric, days_remaining integer, daily_remaining numeric)
language sql set search_path to 'public' as $$
  with v as (
    select coalesce(p_start, (p_month || '-01')::date) as v_start,
           coalesce(p_end,   (p_month || '-01')::date + interval '1 month')::date as v_end
  ),
  var_cats as (
    select c.id, c.name from categories c where c.is_variable = true and c.type = 'depense'
  ),
  var_budget as (
    select coalesce(sum(subcategory_budget_at(s.id, p_month)), 0)::numeric as total
    from subcategories s
    join var_cats vc on s.category_id = vc.id
    where s.archived_at is null
  ),
  all_tx as (
    select amount, type, category, categorized from transactions, v
    where coalesce(accounting_date, date::date) >= v.v_start
      and coalesce(accounting_date, date::date) <  v.v_end
      and hors_budget = false
    union all
    select amount, type, category, categorized
    from v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
  ),
  var_spent as (
    select coalesce(sum(abs(t.amount)), 0)::numeric as total
    from all_tx t
    where t.type = 'depense' and t.categorized = true and (
      t.category in (select name from var_cats)
      or exists (
        select 1 from subcategories sx
        join var_cats vc on sx.category_id = vc.id
        where sx.id::text = t.category
      )
    )
  ),
  date_calc as (
    select greatest((select v_end from v) - current_date, 1)::int as days_rem
  )
  select vb.total, vs.total, vb.total - vs.total, dc.days_rem,
    case when dc.days_rem <= 1 then vb.total - vs.total
         else (vb.total - vs.total) / dc.days_rem end
  from var_budget vb, var_spent vs, date_calc dc
$$;

create or replace function public.get_dashboard_month(p_month text, p_start date default null, p_end date default null)
returns table(type text, spent numeric, budget numeric)
language sql set search_path to 'public' as $$
  with v as (
    select coalesce(p_start, (p_month || '-01')::date) as v_start,
           coalesce(p_end,   (p_month || '-01')::date + interval '1 month')::date as v_end
  ),
  tx_spent as (
    select t.type, sum(abs(t.amount)) as spent from transactions t, v
    where coalesce(t.accounting_date, t.date::date) >= v.v_start
      and coalesce(t.accounting_date, t.date::date) <  v.v_end
      and t.hors_budget = false
    group by t.type
    union all
    select rv.type, sum(abs(rv.amount)) from v, recurring_virtual_for_month(p_month, v.v_start, v.v_end) rv
    group by rv.type
  ),
  tx_combined as (select type, sum(spent) as spent from tx_spent group by type),
  cat_budget as (
    select c.type, coalesce(sum(subcategory_budget_at(s.id, p_month)), 0) as budget
    from categories c
    left join subcategories s on s.category_id = c.id and s.archived_at is null
    group by c.type
  )
  select coalesce(tx.type, cb.type), coalesce(tx.spent, 0), coalesce(cb.budget, 0)
  from tx_combined tx
  full outer join cat_budget cb using (type)
  order by type
$$;

create or replace function public.get_category_suggestions_bulk(p_names text[])
returns table(input_name text, subcategory_id uuid, category_name text, type text)
language sql stable security definer set search_path to 'public' as $$
  with name_list as (select distinct unnest(p_names) as query_name),
  matches as (
    select nl.query_name, t.category, t.type, count(*) as freq
    from name_list nl
    join transactions t on t.user_id = auth.uid() and t.categorized = true
      and t.name ilike '%' || nl.query_name || '%'
      and t.category ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    group by nl.query_name, t.category, t.type
  ),
  best_per_name as (
    select distinct on (query_name) query_name, category, type
    from matches order by query_name, freq desc
  )
  select b.query_name, s.id, s.name, b.type
  from best_per_name b
  join subcategories s on s.id::text = b.category and s.archived_at is null
$$;

create or replace function public.get_label_suggestions(p_query text, p_limit integer default 2)
returns table(label text, type text, category text)
language sql stable security definer set search_path to 'public' as $$
  with matches as (
    select name, type, category, count(*) as name_freq
    from transactions
    where user_id = auth.uid() and categorized = true and name ilike '%' || p_query || '%'
    group by name, type, category
  ),
  cat_freq as (select category, type, sum(name_freq) as total from matches group by category, type),
  best_label as (
    select distinct on (m.category) m.name as label, m.type, m.category as raw_category, cf.total
    from matches m join cat_freq cf on cf.category = m.category and cf.type = m.type
    order by m.category, m.name_freq desc
  )
  select bl.label, bl.type, coalesce(s.name, bl.raw_category)
  from best_label bl
  left join subcategories s on s.id::text = bl.raw_category and s.archived_at is null
  order by bl.total desc
  limit p_limit
$$;

create or replace function public.create_savings_goal(p_name text, p_target numeric, p_start numeric, p_color text, p_month text, p_sort integer)
returns savings_goals language plpgsql set search_path to 'public' as $$
declare
  v_cat_id uuid;
  v_sub_id uuid;
  v_goal   public.savings_goals;
begin
  insert into public.categories (user_id, name, icon_key, color, type, sort_order)
  values (auth.uid(), btrim(p_name), 'piggy-bank', p_color, 'epargne', p_sort)
  returning id into v_cat_id;

  insert into public.subcategories (user_id, category_id, name, budget, sort_order, valid_from, valid_to)
  values (auth.uid(), v_cat_id, btrim(p_name), 0, 0, p_month, null)
  returning id into v_sub_id;

  insert into public.subcategory_budgets (subcategory_id, effective_from, budget)
  values (v_sub_id, p_month, 0);

  insert into public.savings_goals (user_id, name, target_amount, start_amount, subcategory_id, color)
  values (auth.uid(), btrim(p_name), p_target, p_start, v_sub_id, p_color)
  returning * into v_goal;

  return v_goal;
end;
$$;

-- 6. Obsolète --------------------------------------------------------------
drop function if exists public.version_subcategory_budget(uuid, text, numeric, text);
