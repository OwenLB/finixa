-- Test d'isolation cross-user (Vague 2). Vérifie qu'un utilisateur authentifié
-- ne voit QUE ses propres lignes — la garantie de sécurité centrale de l'app.
--
-- Méthode : on seed 2 utilisateurs + leurs données en tant que rôle privilégié
-- (qui bypass la RLS), puis on bascule sur le rôle `authenticated` avec le JWT
-- de A (set local request.jwt.claims) — là, la RLS s'applique et doit filtrer
-- les lignes de B. Le tout dans une transaction `rollback` (n'écrit rien).
begin;
select plan(3);

-- ── Seed (rôle privilégié, RLS contournée) ──────────────────────────────────
insert into auth.users (id, aud, role, email)
values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.finixa'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'b@test.finixa');

insert into public.transactions (user_id, name, amount, date, type)
values
  ('11111111-1111-1111-1111-111111111111', 'A-loyer',   -1000, now(), 'depense'),
  ('11111111-1111-1111-1111-111111111111', 'A-salaire',  2000, now(), 'revenu'),
  ('22222222-2222-2222-2222-222222222222', 'B-secret',   -500, now(), 'depense');

-- ── On se fait passer pour l'utilisateur A ──────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.transactions),
  2,
  'A ne voit que ses 2 transactions (RLS masque celles de B)'
);

select is(
  (select count(*)::int from public.transactions where name = 'B-secret'),
  0,
  'La transaction de B est totalement invisible pour A'
);

-- ── INSERT pour autrui interdit (with check) ────────────────────────────────
select throws_ok(
  $$ insert into public.transactions (user_id, name, amount, date, type)
     values ('22222222-2222-2222-2222-222222222222', 'usurpation', -1, now(), 'depense') $$,
  '42501',
  null,
  'A ne peut pas insérer une transaction au nom de B (violation RLS)'
);

reset role;
select * from finish();
rollback;
