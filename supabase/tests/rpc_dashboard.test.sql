-- Tests des RPC de stats (Vague 2 — exactitude des chiffres).
-- get_dashboard_month doit exclure les dépenses marquées hors_budget.
begin;
select plan(1);

insert into auth.users (id, aud, role, email)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.finixa');

insert into public.transactions (user_id, name, amount, date, type, hors_budget)
values
  ('11111111-1111-1111-1111-111111111111', 'normale',     -100, '2026-06-10T12:00:00', 'depense', false),
  ('11111111-1111-1111-1111-111111111111', 'hors-budget',  -50, '2026-06-11T12:00:00', 'depense', true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select spent from public.get_dashboard_month('2026-06') where type = 'depense'),
  100::numeric,
  'get_dashboard_month additionne 100 (la dépense hors_budget de 50 est exclue)'
);

reset role;
select * from finish();
rollback;
