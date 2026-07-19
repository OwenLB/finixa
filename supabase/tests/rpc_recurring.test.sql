-- recurring_virtual_for_month : génération des occurrences virtuelles.
-- Vérifie le fix DB-C2 (la fréquence trimestrielle était ignorée en prod).
begin;
select plan(2);

insert into auth.users (id, aud, role, email)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.finixa');

-- Récurrence trimestrielle ancrée au 10 janvier → occurrences jan/avr/juil/oct
insert into public.recurring_transactions (user_id, name, amount, type, frequency, day_of_month, start_date)
values ('11111111-1111-1111-1111-111111111111', 'Assurance', -300, 'depense', 'quarterly', 10, '2026-01-10');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.recurring_virtual_for_month('2026-04')),
  1,
  'avril (jan + 3 mois) : une occurrence trimestrielle générée (fix DB-C2)'
);

select is(
  (select count(*)::int from public.recurring_virtual_for_month('2026-02')),
  0,
  'février : aucune occurrence (pas un mois de trimestre)'
);

reset role;
select * from finish();
rollback;
