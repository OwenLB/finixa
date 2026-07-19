-- Isolation RLS cross-user sur les RPCs de stats.
--
-- Scénario : utilisateur A (revenus 2 500 €, dépenses 100 € + récurrent virtuel 300 €)
--            utilisateur B (revenus 5 000 €, dépenses 200 € + récurrent virtuel 1 000 €)
--
-- On appelle chaque RPC en tant que A et on vérifie qu'il ne renvoie QUE les
-- données de A. Si un RPC utilisait SECURITY DEFINER, il agrégerait A+B et
-- les montants seraient multipliés (ex. 2 500 → 7 500 pour les revenus).
--
-- Test canary (plan 1) : détecte automatiquement tout futur SECURITY DEFINER
-- accidentel sur ces fonctions, sans avoir besoin d'inspecter les montants.
begin;
select plan(6);

-- ── Seed (rôle privilégié, RLS contournée) ──────────────────────────────────
insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@rls-rpc.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@rls-rpc.test');

insert into public.transactions (user_id, name, amount, date, type, hors_budget, categorized) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A-salaire',  2500, '2026-06-15', 'revenu',  false, false),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A-courses', -100,  '2026-06-10', 'depense', false, false),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'B-salaire',  5000, '2026-06-15', 'revenu',  false, false),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'B-courses', -200,  '2026-06-10', 'depense', false, false);

-- Récurrents non matérialisés : A = 300 €/mois, B = 1 000 €/mois
insert into public.recurring_transactions (user_id, amount, type, start_date, frequency) values
  ('aaaaaaaa-0000-0000-0000-000000000000', -300,  'depense', '2026-01-01', 'monthly'),
  ('bbbbbbbb-0000-0000-0000-000000000000', -1000, 'depense', '2026-01-01', 'monthly');

-- ── On se fait passer pour l'utilisateur A ──────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}';

-- 1. Canary SECURITY DEFINER ─────────────────────────────────────────────────
--    Si un futur développeur ajoute SECURITY DEFINER sur l'un de ces RPCs,
--    ce test casse immédiatement avant même qu'on touche aux montants.
select is(
  (select count(*)::int from pg_proc
   where proname in (
     'get_dashboard_summary',
     'get_dashboard_month',
     'get_subcategory_stats',
     'get_category_spent',
     'get_envelope_stats',
     'get_uncategorized_stats',
     'get_variable_daily_remaining',
     'recurring_virtual_for_month'
   )
   and prosecdef = true),
  0,
  'canary : aucun RPC de stats ne doit utiliser SECURITY DEFINER (bypass RLS)'
);

-- 2. get_dashboard_summary — revenus ─────────────────────────────────────────
--    A : 2 500. A+B : 7 500. Le RPC doit retourner 2 500.
select is(
  (select spent_prev
   from public.get_dashboard_summary('2026-06')
   where type = 'revenu'),
  2500::numeric,
  'get_dashboard_summary : revenus de A uniquement (2 500, pas 7 500 = A+B)'
);

-- 3. get_dashboard_summary — dépenses (réelles + virtuelles) ─────────────────
--    A : 100 réel + 300 virtuel = 400.
--    A+B : 100+200+300+1000 = 1 600. Le RPC doit retourner 400.
select is(
  (select spent_prev
   from public.get_dashboard_summary('2026-06')
   where type = 'depense'),
  400::numeric,
  'get_dashboard_summary : dépenses de A seul, récurrents virtuels inclus (400, pas 1 600)'
);

-- 4. get_dashboard_month — revenus ───────────────────────────────────────────
--    Même garantie que #2 mais sur un RPC différent.
select is(
  (select spent
   from public.get_dashboard_month('2026-06')
   where type = 'revenu'),
  2500::numeric,
  'get_dashboard_month : revenus de A uniquement (2 500, pas 7 500 = A+B)'
);

-- 5. get_uncategorized_stats — dépenses ──────────────────────────────────────
--    A : 100 réel + 300 virtuel (uncategorized par défaut) = 400.
--    A+B : 100+300+200+1000 = 1 600. Le RPC doit retourner 400.
select is(
  (select spent
   from public.get_uncategorized_stats('2026-06')
   where type = 'depense'),
  400::numeric,
  'get_uncategorized_stats : dépenses non catégorisées de A uniquement (400, pas 1 600 = A+B)'
);

-- 6. recurring_virtual_for_month ─────────────────────────────────────────────
--    A a 1 récurrent actif, B en a 1 autre. En tant que A, on doit voir 1 seul.
select is(
  (select count(*)::int
   from public.recurring_virtual_for_month('2026-06')),
  1,
  'recurring_virtual_for_month : 1 seul récurrent virtuel pour A (pas 2 = A+B)'
);

reset role;
select * from finish();
rollback;
