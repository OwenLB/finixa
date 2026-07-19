-- Cohérence des occurrences récurrentes virtuelles (recurring_virtual_for_month)
-- et de la réconciliation (réel + virtuel = attendu, SANS double comptage).
-- Un utilisateur distinct par scénario → isolation RLS = compteur propre.
begin;
select plan(8);

insert into auth.users (id, aud, role, email) values
  ('a1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'mensuel@test.finixa'),
  ('b2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'annuel@test.finixa'),
  ('c3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'hebdo@test.finixa'),
  ('d4444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'couv@test.finixa');

-- Mensuel ancré au 31 → teste le clamp en fin de mois court (février)
insert into public.recurring_transactions (user_id, name, amount, type, frequency, day_of_month, start_date)
values ('a1111111-1111-1111-1111-111111111111', 'Loyer', -10, 'depense', 'monthly', 31, '2026-01-31');

-- Annuel ancré en mars
insert into public.recurring_transactions (user_id, name, amount, type, frequency, start_date)
values ('b2222222-2222-2222-2222-222222222222', 'Assurance', -500, 'depense', 'yearly', '2026-03-20');

-- Hebdomadaire à partir du 1er juin
insert into public.recurring_transactions (user_id, name, amount, type, frequency, start_date)
values ('c3333333-3333-3333-3333-333333333333', 'Abonnement', -20, 'depense', 'weekly', '2026-06-01');

-- Couverture : R1 non matérialisé (1 virtuelle) + R2 matérialisé (0 virtuelle)
insert into public.recurring_transactions (id, user_id, name, amount, type, frequency, day_of_month, start_date)
values
  ('e1000000-0000-0000-0000-000000000001', 'd4444444-4444-4444-4444-444444444444', 'R1', -300, 'depense', 'monthly', 10, '2026-01-10'),
  ('e2000000-0000-0000-0000-000000000002', 'd4444444-4444-4444-4444-444444444444', 'R2', -100, 'depense', 'monthly', 15, '2026-01-15');
insert into public.transactions (user_id, name, amount, date, type, categorized, category, hors_budget, recurring_id)
values ('d4444444-4444-4444-4444-444444444444', 'R2 réel', -100, '2026-06-15T12:00:00', 'depense', false, '', false, 'e2000000-0000-0000-0000-000000000002');

set local role authenticated;

-- Mensuel
set local request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*)::int from public.recurring_virtual_for_month('2026-06')), 1, 'mensuel : 1 occurrence en juin');
select is((select count(*)::int from public.recurring_virtual_for_month('2026-02')), 1, 'mensuel jour 31 : clampé au 28 février (1 occurrence)');
select is((select count(*)::int from public.recurring_virtual_for_month('2025-12')), 0, 'mensuel : aucune avant la date de début');

-- Annuel
set local request.jwt.claims = '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*)::int from public.recurring_virtual_for_month('2026-03')), 1, 'annuel : 1 occurrence dans le mois de début (mars)');
select is((select count(*)::int from public.recurring_virtual_for_month('2026-06')), 0, 'annuel : 0 hors mois de début');

-- Hebdomadaire
set local request.jwt.claims = '{"sub":"c3333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is((select count(*)::int from public.recurring_virtual_for_month('2026-06')), 5, 'hebdo : 5 occurrences en juin 2026');

-- Couverture / réconciliation
set local request.jwt.claims = '{"sub":"d4444444-4444-4444-4444-444444444444","role":"authenticated"}';
select is((select count(*)::int from public.recurring_virtual_for_month('2026-06')), 1, 'couverture : R2 matérialisé → 1 seule virtuelle (R1)');
select is(
  (select spent from public.get_dashboard_month('2026-06') where type = 'depense'),
  400::numeric,
  'pas de double comptage : 300 (virtuel R1) + 100 (réel R2) = 400');

reset role;
select * from finish();
rollback;
