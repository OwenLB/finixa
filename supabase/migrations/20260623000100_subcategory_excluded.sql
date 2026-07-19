-- Étend le flag « exclu des calculs » au niveau de la sous-catégorie.
-- Même logique que categories.excluded mais plus fin : on peut exclure une
-- sous-catégorie précise (ex: la ligne « Livret A » d'une catégorie épargne)
-- sans exclure toute la catégorie.
ALTER TABLE subcategories
  ADD COLUMN IF NOT EXISTS excluded BOOLEAN NOT NULL DEFAULT false;

-- Le versionnement de budget recrée une ligne de sous-catégorie : il doit
-- reporter le flag `excluded` (comme il reporte déjà `envelope`), sinon une
-- modification de budget réinitialiserait l'exclusion.
create or replace function public.version_subcategory_budget(
  p_id     uuid,
  p_name   text,
  p_budget numeric,
  p_month  text
)
returns public.subcategories
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_cur public.subcategories;
  v_new public.subcategories;
begin
  select * into v_cur from public.subcategories where id = p_id;
  if not found then
    raise exception 'Subcategory % introuvable', p_id;
  end if;

  insert into public.subcategories (user_id, category_id, name, budget, sort_order, valid_from, valid_to, envelope, excluded)
  values (auth.uid(), v_cur.category_id, btrim(p_name), p_budget, v_cur.sort_order, p_month, null, v_cur.envelope, v_cur.excluded)
  returning * into v_new;

  update public.subcategories
  set valid_to = to_char((p_month || '-01')::date - interval '1 month', 'YYYY-MM')
  where id = p_id;

  return v_new;
end;
$function$;

revoke execute on function public.version_subcategory_budget(uuid, text, numeric, text) from public, anon;
grant execute on function public.version_subcategory_budget(uuid, text, numeric, text) to authenticated;
