-- Cohérence : non catégorisées + budget variable quotidien.
--  • get_uncategorized_stats     : montants des tx NON catégorisées par type
--  • get_variable_daily_remaining: budget/dépensé/restant des catégories variables
begin;
select plan(6);

insert into auth.users (id, aud, role, email)
values ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'uv@test.finixa');

-- Catégorie variable (dépense) + sous-catégorie avec budget
insert into public.categories (id, user_id, name, icon_key, color, type, is_variable)
values ('c3000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Variable', 'bolt', '#ffffff', 'depense', true);

insert into public.subcategories (id, category_id, user_id, name, budget, valid_from)
values ('53000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Divers', 300, '2020-01');

-- Budget historisé (le budget du mois est lu depuis subcategory_budgets)
insert into public.subcategory_budgets (subcategory_id, effective_from, budget)
values ('53000000-0000-0000-0000-000000000001', '2020-01', 300);

insert into public.transactions (user_id, name, amount, date, type, categorized, category, hors_budget)
values
  -- non catégorisées
  ('33333333-3333-3333-3333-333333333333', 'u1', -25, '2026-06-05T12:00:00', 'depense', false, '', false),
  ('33333333-3333-3333-3333-333333333333', 'u2', -75, '2026-06-06T12:00:00', 'depense', false, '', false),
  ('33333333-3333-3333-3333-333333333333', 'u3',  40, '2026-06-07T12:00:00', 'revenu',  false, '', false),
  -- catégorisée variable (compte dans variable_spent, pas dans uncategorized)
  ('33333333-3333-3333-3333-333333333333', 'v1', -120, '2026-06-08T12:00:00', 'depense', true, '53000000-0000-0000-0000-000000000001', false),
  -- hors_budget non catégorisée → exclue partout
  ('33333333-3333-3333-3333-333333333333', 'hb', -500, '2026-06-09T12:00:00', 'depense', false, '', true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

-- get_uncategorized_stats
select is((select spent    from public.get_uncategorized_stats('2026-06') where type = 'depense'), 100::numeric, 'non catégorisées depense : 25 + 75 = 100 (hors_budget exclu)');
select is((select tx_count from public.get_uncategorized_stats('2026-06') where type = 'depense'), 2::bigint,   'non catégorisées depense : 2 transactions');
select is((select spent    from public.get_uncategorized_stats('2026-06') where type = 'revenu'),  40::numeric, 'non catégorisées revenu : 40');

-- get_variable_daily_remaining : remaining = budget - dépensé
select is((select variable_budget from public.get_variable_daily_remaining('2026-06')), 300::numeric, 'budget variable = 300');
select is((select variable_spent  from public.get_variable_daily_remaining('2026-06')), 120::numeric, 'dépensé variable = 120');
select is((select remaining       from public.get_variable_daily_remaining('2026-06')), 180::numeric, 'restant = 300 - 120 = 180');

reset role;
select * from finish();
rollback;
