-- Cohérence des montants agrégés du dashboard (get_dashboard_month).
-- Propriétés vérifiées : somme en valeur absolue (ABS), exclusion hors_budget,
-- séparation par type, somme des budgets de sous-catégories valides.
begin;
select plan(5);

insert into auth.users (id, aud, role, email)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'dash@test.finixa');

insert into public.categories (id, user_id, name, icon_key, color, type)
values ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Courses', 'cart', '#ffffff', 'depense');

insert into public.subcategories (id, category_id, user_id, name, budget, valid_from)
values ('51000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alimentation', 200, '2020-01');

-- Budget historisé (le budget du mois est lu depuis subcategory_budgets)
insert into public.subcategory_budgets (subcategory_id, effective_from, budget)
values ('51000000-0000-0000-0000-000000000001', '2020-01', 200);

insert into public.transactions (user_id, name, amount, date, type, categorized, category, hors_budget)
values
  ('11111111-1111-1111-1111-111111111111', 'depense normale', -100, '2026-06-10T12:00:00', 'depense', false, '', false),
  ('11111111-1111-1111-1111-111111111111', 'depense hb',        -50, '2026-06-11T12:00:00', 'depense', false, '', true),
  ('11111111-1111-1111-1111-111111111111', 'revenu',            200, '2026-06-12T12:00:00', 'revenu',  false, '', false),
  ('11111111-1111-1111-1111-111111111111', 'depense extra',     -30, '2026-06-13T12:00:00', 'depense', false, '', false);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select spent from public.get_dashboard_month('2026-06') where type = 'depense'),
  130::numeric, 'depense : 100 + 30 = 130 (la dépense hors_budget de 50 est exclue)');

select is(
  (select spent from public.get_dashboard_month('2026-06') where type = 'revenu'),
  200::numeric, 'revenu : 200 (montant en valeur absolue)');

select is(
  (select budget from public.get_dashboard_month('2026-06') where type = 'depense'),
  200::numeric, 'budget depense = somme des sous-catégories valides (200)');

select is(
  (select coalesce(budget, 0) from public.get_dashboard_month('2026-06') where type = 'revenu'),
  0::numeric, 'budget revenu = 0 (aucune sous-catégorie revenu)');

select is(
  (select coalesce(sum(spent), 0) from public.get_dashboard_month('2026-05')),
  0::numeric, 'mai : aucune dépense ni revenu');

reset role;
select * from finish();
rollback;
