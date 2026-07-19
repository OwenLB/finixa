-- Isolation RLS cross-user sur toutes les autres tables (Vague 2).
-- Même principe que rls_isolation.test.sql : seed A + B en rôle privilégié,
-- puis lecture en tant que A (rôle authenticated + JWT) qui ne doit voir que
-- ses propres lignes sur chaque table. Transaction rollback (n'écrit rien).
begin;
select plan(9);

-- ── Utilisateurs ────────────────────────────────────────────────────────────
insert into auth.users (id, aud, role, email)
values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.finixa'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'b@test.finixa');

-- ── Une ligne par table pour A et pour B ────────────────────────────────────
insert into public.categories (id, user_id, name, icon_key, color, type)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A-cat', 'x', '#fff', 'depense'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'B-cat', 'x', '#fff', 'depense');

insert into public.subcategories (user_id, category_id, name)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A-sub'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B-sub');

insert into public.recurring_transactions (user_id, amount, type)
values
  ('11111111-1111-1111-1111-111111111111', -10, 'depense'),
  ('22222222-2222-2222-2222-222222222222', -10, 'depense');

insert into public.favorites (user_id, name, amount, type)
values
  ('11111111-1111-1111-1111-111111111111', 'A-fav', -5, 'depense'),
  ('22222222-2222-2222-2222-222222222222', 'B-fav', -5, 'depense');

insert into public.savings_goals (user_id, name)
values
  ('11111111-1111-1111-1111-111111111111', 'A-goal'),
  ('22222222-2222-2222-2222-222222222222', 'B-goal');

insert into public.user_api_keys (user_id, key_hash)
values
  ('11111111-1111-1111-1111-111111111111', 'hash-A'),
  ('22222222-2222-2222-2222-222222222222', 'hash-B');

insert into public.user_preferences (user_id)
values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.budget_envelopes (user_id)
values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
values
  ('11111111-1111-1111-1111-111111111111', 'ep-A', 'p-A', 'a-A'),
  ('22222222-2222-2222-2222-222222222222', 'ep-B', 'p-B', 'a-B');

-- ── On lit en tant que A ────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*)::int from public.categories),             1, 'categories : A ne voit que la sienne');
select is((select count(*)::int from public.subcategories),          1, 'subcategories : A ne voit que la sienne');
select is((select count(*)::int from public.recurring_transactions), 1, 'recurring_transactions : isolées');
select is((select count(*)::int from public.favorites),              1, 'favorites : isolés');
select is((select count(*)::int from public.savings_goals),          1, 'savings_goals : isolées');
select is((select count(*)::int from public.user_api_keys),          1, 'user_api_keys : isolées (hashes de clés)');
select is((select count(*)::int from public.user_preferences),       1, 'user_preferences : isolées');
select is((select count(*)::int from public.budget_envelopes),       1, 'budget_envelopes : isolées');
select is((select count(*)::int from public.push_subscriptions),     1, 'push_subscriptions : isolées');

reset role;
select * from finish();
rollback;
