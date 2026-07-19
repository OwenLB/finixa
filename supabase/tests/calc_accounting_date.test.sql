-- Cohérence de la date comptable (accounting_date) : une transaction est
-- rattachée à la PÉRIODE de sa date comptable (si présente), pas de sa date.
begin;
select plan(2);

insert into auth.users (id, aud, role, email)
values ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'acc@test.finixa');

insert into public.transactions (user_id, name, amount, date, type, categorized, category, hors_budget, accounting_date)
values
  -- saisie le 28 mai mais comptabilisée le 2 juin → compte en JUIN
  ('44444444-4444-4444-4444-444444444444', 'mai vers juin',  -60, '2026-05-28T12:00:00', 'depense', false, '', false, '2026-06-02'),
  -- saisie le 28 juin mais comptabilisée le 1er juillet → compte en JUILLET
  ('44444444-4444-4444-4444-444444444444', 'juin vers juil', -70, '2026-06-28T12:00:00', 'depense', false, '', false, '2026-07-01');

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select is(
  (select coalesce(spent, 0) from public.get_dashboard_month('2026-06') where type = 'depense'),
  60::numeric,
  'juin : seule la tx comptabilisée en juin compte (60), pas celle comptabilisée en juillet');

select is(
  (select coalesce(spent, 0) from public.get_dashboard_month('2026-07') where type = 'depense'),
  70::numeric,
  'juillet : la tx comptabilisée le 1er juillet compte (70)');

reset role;
select * from finish();
rollback;
