-- Cohérence des stats par (sous-)catégorie et par enveloppe.
--  • get_subcategory_stats : dépense par sous-catégorie (tx catégorisées sur l'id)
--  • get_category_spent    : total = direct (nom de catégorie) + via sous-catégories
--  • get_envelope_stats    : agrégat par enveloppe (needs/wants/savings)
begin;
select plan(8);

insert into auth.users (id, aud, role, email)
values ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'cat@test.finixa');

insert into public.categories (id, user_id, name, icon_key, color, type)
values ('c2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Courses', 'cart', '#ffffff', 'depense');

insert into public.subcategories (id, category_id, user_id, name, budget, envelope, valid_from)
values
  ('52000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Alimentation', 200, 'wants', '2020-01'),
  ('52000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Restaurant',   100, 'wants', '2020-01');

insert into public.transactions (user_id, name, amount, date, type, categorized, category, hors_budget)
values
  -- catégorisées sur la sous-catégorie Alimentation (id)
  ('22222222-2222-2222-2222-222222222222', 'a1', -30, '2026-06-03T12:00:00', 'depense', true, '52000000-0000-0000-0000-000000000001', false),
  ('22222222-2222-2222-2222-222222222222', 'a2', -20, '2026-06-04T12:00:00', 'depense', true, '52000000-0000-0000-0000-000000000001', false),
  -- catégorisée sur Restaurant
  ('22222222-2222-2222-2222-222222222222', 'r1', -25, '2026-06-05T12:00:00', 'depense', true, '52000000-0000-0000-0000-000000000002', false),
  -- catégorisée directement sur le NOM de la catégorie (pas une sous-cat)
  ('22222222-2222-2222-2222-222222222222', 'direct', -40, '2026-06-06T12:00:00', 'depense', true, 'Courses', false),
  -- non catégorisée → exclue des stats par sous-catégorie
  ('22222222-2222-2222-2222-222222222222', 'uncat', -15, '2026-06-07T12:00:00', 'depense', false, '', false),
  -- hors_budget sur Alimentation → exclue
  ('22222222-2222-2222-2222-222222222222', 'hb', -1000, '2026-06-08T12:00:00', 'depense', true, '52000000-0000-0000-0000-000000000001', true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- get_subcategory_stats
select is((select spent    from public.get_subcategory_stats('2026-06') where subcategory_id = '52000000-0000-0000-0000-000000000001'), 50::numeric, 'Alimentation : 30 + 20 = 50');
select is((select tx_count from public.get_subcategory_stats('2026-06') where subcategory_id = '52000000-0000-0000-0000-000000000001'), 2::bigint,  'Alimentation : 2 transactions');
select is((select spent    from public.get_subcategory_stats('2026-06') where subcategory_id = '52000000-0000-0000-0000-000000000002'), 25::numeric, 'Restaurant : 25');

-- get_category_spent : total = 50 + 25 + 40 = 115 ; direct = 40 (1 tx sur le nom)
select is((select total_spent  from public.get_category_spent('2026-06') where category_id = 'c2000000-0000-0000-0000-000000000002'), 115::numeric, 'Courses total = 115 (sous-cats 75 + direct 40)');
select is((select direct_spent from public.get_category_spent('2026-06') where category_id = 'c2000000-0000-0000-0000-000000000002'), 40::numeric,  'Courses direct = 40');
select is((select direct_count from public.get_category_spent('2026-06') where category_id = 'c2000000-0000-0000-0000-000000000002'), 1::bigint,   'Courses direct_count = 1');

-- get_envelope_stats : wants = 50 + 25 = 75, 3 transactions
select is((select spent    from public.get_envelope_stats('2026-06') where envelope = 'wants'), 75::numeric, 'enveloppe wants = 75');
select is((select tx_count from public.get_envelope_stats('2026-06') where envelope = 'wants'), 3::bigint,  'enveloppe wants = 3 transactions');

reset role;
select * from finish();
rollback;
