-- Modèle « identité stable + historique de budget ».
--  • subcategory_budget_at : budget du mois = dernière version <= ce mois
--  • attribution par id SEUL : une transaction antérieure au 1er budget reste
--    catégorisée (plus d'orphelinage / gating par valid_from)
--  • sous-catégorie archivée : absente du détail, mais ses transactions comptent
--    toujours dans le total de la catégorie
begin;
select plan(7);

insert into auth.users (id, aud, role, email)
values ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'si@test.finixa');

insert into public.categories (id, user_id, name, icon_key, color, type)
values ('c4000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'Courses', 'cart', '#fff', 'depense');

-- Sous-cat A active ; sous-cat B archivée (soft-delete)
insert into public.subcategories (id, category_id, user_id, name, valid_from, archived_at)
values
  ('54000000-0000-0000-0000-00000000000a', 'c4000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'A', '2020-01', null),
  ('54000000-0000-0000-0000-00000000000b', 'c4000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'B', '2020-01', now());

-- Historique de budget de A : 100 dès mars, 250 dès juin
insert into public.subcategory_budgets (subcategory_id, effective_from, budget)
values
  ('54000000-0000-0000-0000-00000000000a', '2026-03', 100),
  ('54000000-0000-0000-0000-00000000000a', '2026-06', 250);

insert into public.transactions (user_id, name, amount, date, type, categorized, category, hors_budget)
values
  -- catégorisée en JANVIER, avant tout budget → doit rester attribuée
  ('44444444-4444-4444-4444-444444444444', 'jan', -40, '2026-01-10T12:00:00', 'depense', true, '54000000-0000-0000-0000-00000000000a', false),
  ('44444444-4444-4444-4444-444444444444', 'jun', -60, '2026-06-10T12:00:00', 'depense', true, '54000000-0000-0000-0000-00000000000a', false),
  -- catégorisée sur la sous-cat ARCHIVÉE
  ('44444444-4444-4444-4444-444444444444', 'arch', -15, '2026-06-11T12:00:00', 'depense', true, '54000000-0000-0000-0000-00000000000b', false);

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

-- Résolution du budget par mois
select is(public.subcategory_budget_at('54000000-0000-0000-0000-00000000000a', '2026-02'), null::numeric, 'budget février = null (avant la 1re version)');
select is(public.subcategory_budget_at('54000000-0000-0000-0000-00000000000a', '2026-04'), 100::numeric,  'budget avril = 100');
select is(public.subcategory_budget_at('54000000-0000-0000-0000-00000000000a', '2026-07'), 250::numeric,  'budget juillet = 250 (dernière version <= mois)');

-- Pas d'orphelinage : la transaction de janvier (avant budget) reste attribuée
select is((select spent from public.get_subcategory_stats('2026-01') where subcategory_id = '54000000-0000-0000-0000-00000000000a'),
  40::numeric, 'transaction de janvier attribuée malgré l''absence de budget ce mois-là');

-- Sous-cat archivée absente du détail par sous-catégorie
select is((select count(*)::int from public.get_subcategory_stats('2026-06') where subcategory_id = '54000000-0000-0000-0000-00000000000b'),
  0, 'la sous-catégorie archivée n''apparaît pas dans get_subcategory_stats');

-- ... mais ses transactions comptent dans le total de la catégorie
select is((select total_spent from public.get_category_spent('2026-06') where category_id = 'c4000000-0000-0000-0000-000000000004'),
  75::numeric, 'total catégorie juin = 60 (A) + 15 (archivée) = 75');

-- Budget du mois via get_dashboard_month (déterministe, mois explicite)
select is((select budget from public.get_dashboard_month('2026-06') where type = 'depense'),
  250::numeric, 'budget dépense juin = 250 (version courante de A ; archivée exclue)');

reset role;
select * from finish();
rollback;
