-- ============================================================================
-- RPC transactionnelles pour les écritures multi-étapes
--
-- Ces opérations enchaînaient plusieurs requêtes côté client : un échec à
-- mi-parcours laissait des données incohérentes (sous-catégorie clôturée sans
-- successeur, catégorie/sous-catégorie orphelines). Encapsulées dans une
-- fonction plpgsql, elles sont atomiques (rollback automatique sur erreur).
--
-- SECURITY INVOKER : la RLS s'applique normalement ; on insère avec
-- auth.uid() comme user_id (conforme aux policies with check).
-- ============================================================================

-- Q18 — Versionnement du budget d'une sous-catégorie :
-- insère la nouvelle ligne (valid_from = mois courant) puis clôture l'ancienne
-- (valid_to = mois précédent), atomiquement.
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

  insert into public.subcategories (user_id, category_id, name, budget, sort_order, valid_from, valid_to, envelope)
  values (auth.uid(), v_cur.category_id, btrim(p_name), p_budget, v_cur.sort_order, p_month, null, v_cur.envelope)
  returning * into v_new;

  update public.subcategories
  set valid_to = to_char((p_month || '-01')::date - interval '1 month', 'YYYY-MM')
  where id = p_id;

  return v_new;
end;
$function$;

-- Q16 — Création d'une cagnotte d'épargne : catégorie 'epargne' + sous-catégorie
-- liée + objectif, atomiquement.
create or replace function public.create_savings_goal(
  p_name   text,
  p_target numeric,
  p_start  numeric,
  p_color  text,
  p_month  text,
  p_sort   integer
)
returns public.savings_goals
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_cat_id uuid;
  v_sub_id uuid;
  v_goal   public.savings_goals;
begin
  insert into public.categories (user_id, name, icon_key, color, type, sort_order)
  values (auth.uid(), btrim(p_name), 'piggy-bank', p_color, 'epargne', p_sort)
  returning id into v_cat_id;

  insert into public.subcategories (user_id, category_id, name, budget, sort_order, valid_from, valid_to)
  values (auth.uid(), v_cat_id, btrim(p_name), 0, 0, p_month, null)
  returning id into v_sub_id;

  insert into public.savings_goals (user_id, name, target_amount, start_amount, subcategory_id, color)
  values (auth.uid(), btrim(p_name), p_target, p_start, v_sub_id, p_color)
  returning * into v_goal;

  return v_goal;
end;
$function$;

revoke execute on function public.version_subcategory_budget(uuid, text, numeric, text) from public, anon;
revoke execute on function public.create_savings_goal(text, numeric, numeric, text, text, integer) from public, anon;
grant execute on function public.version_subcategory_budget(uuid, text, numeric, text) to authenticated;
grant execute on function public.create_savings_goal(text, numeric, numeric, text, text, integer) to authenticated;
