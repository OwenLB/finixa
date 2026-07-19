-- RPC transactionnelles + modèle « identité stable + historique de budget ».
--  • create_savings_goal : catégorie + sous-catégorie + version de budget + objectif
--  • subcategory_budgets : changer un budget = upsert (id de sous-cat inchangé)
begin;
select plan(7);

insert into auth.users (id, aud, role, email)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.finixa');

-- Pré-existant : une sous-catégorie avec sa version de budget initiale
insert into public.categories (id, user_id, name, icon_key, color, type)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Alimentation', 'x', '#fff', 'depense');
insert into public.subcategories (id, user_id, category_id, name, valid_from, valid_to)
values ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Courses', '2026-05', null);
insert into public.subcategory_budgets (subcategory_id, effective_from, budget)
values ('55555555-5555-5555-5555-555555555555', '2026-05', 100);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ── create_savings_goal : catégorie + sous-catégorie + version de budget + objectif ─
select public.create_savings_goal('Vacances', 1000, 0, '#60a5fa', '2026-06', 0);

select is((select count(*)::int from public.savings_goals where name = 'Vacances'), 1,
  'create_savings_goal crée l''objectif');
select is((select count(*)::int from public.categories where name = 'Vacances' and type = 'epargne'), 1,
  'create_savings_goal crée la catégorie épargne liée');
select is((select count(*)::int from public.subcategories where name = 'Vacances'), 1,
  'create_savings_goal crée la sous-catégorie liée');
select is(
  (select count(*)::int from public.subcategory_budgets sb
     join public.subcategories s on s.id = sb.subcategory_id where s.name = 'Vacances'),
  1, 'create_savings_goal crée la version de budget initiale');

-- ── Changement de budget : upsert dans l'historique, identité stable ────────
insert into public.subcategory_budgets (subcategory_id, effective_from, budget)
values ('55555555-5555-5555-5555-555555555555', '2026-06', 200)
on conflict (subcategory_id, effective_from) do update set budget = excluded.budget;

select is(
  (select count(*)::int from public.subcategories where id = '55555555-5555-5555-5555-555555555555'),
  1, 'changer le budget ne crée PAS de nouvelle sous-catégorie (id stable)');
select is(
  public.subcategory_budget_at('55555555-5555-5555-5555-555555555555', '2026-05'),
  100::numeric, 'budget de mai = 100 (version précédente préservée)');
select is(
  public.subcategory_budget_at('55555555-5555-5555-5555-555555555555', '2026-06'),
  200::numeric, 'budget de juin = 200 (nouvelle version)');

reset role;
select * from finish();
rollback;
