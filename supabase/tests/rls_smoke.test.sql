-- Premier test pgTAP (Incrément 2). Vérifie que la Row Level Security est
-- ACTIVÉE sur toutes les tables exposées au client. C'est le garde-fou minimal :
-- si une migration future désactivait la RLS sur une table, ce test casserait.
-- (L'isolation cross-user réelle — A ne voit pas B — viendra à l'extension,
--  Vague 2, avec seed d'utilisateurs.)
begin;
select plan(10);

select ok((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass),           'RLS activée sur transactions');
select ok((select relrowsecurity from pg_class where oid = 'public.categories'::regclass),             'RLS activée sur categories');
select ok((select relrowsecurity from pg_class where oid = 'public.subcategories'::regclass),          'RLS activée sur subcategories');
select ok((select relrowsecurity from pg_class where oid = 'public.recurring_transactions'::regclass), 'RLS activée sur recurring_transactions');
select ok((select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass),       'RLS activée sur user_preferences');
select ok((select relrowsecurity from pg_class where oid = 'public.favorites'::regclass),              'RLS activée sur favorites');
select ok((select relrowsecurity from pg_class where oid = 'public.savings_goals'::regclass),          'RLS activée sur savings_goals');
select ok((select relrowsecurity from pg_class where oid = 'public.user_api_keys'::regclass),          'RLS activée sur user_api_keys');
select ok((select relrowsecurity from pg_class where oid = 'public.budget_envelopes'::regclass),       'RLS activée sur budget_envelopes');
select ok((select relrowsecurity from pg_class where oid = 'public.push_subscriptions'::regclass),     'RLS activée sur push_subscriptions');

select * from finish();
rollback;
