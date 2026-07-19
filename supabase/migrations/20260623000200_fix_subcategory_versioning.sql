-- Corrige le versionnement de budget des sous-catégories.
--
-- Bug : version_subcategory_budget créait TOUJOURS une nouvelle ligne (nouvel
-- UUID) et fermait l'ancienne (valid_to = mois - 1). Les transactions
-- référencent la sous-catégorie par son id ; elles restaient donc rattachées à
-- l'ancienne ligne, devenue invalide pour le mois → transactions décatégorisées.
-- Pire : modifier le budget DANS le mois de création donnait une ligne dont
-- l'intervalle de validité était vide (valid_from = juin, valid_to = mai),
-- valide pour aucun mois → orphelinage permanent.
--
-- Correctif :
--  1. Si la version courante est déjà effective ce mois-ci (valid_from >=
--     p_month), on met à jour le budget EN PLACE — pas de nouvelle ligne, donc
--     aucune transaction orpheline ni intervalle dégénéré.
--  2. Sinon (la version vient d'un mois antérieur), on fige l'ancienne (pour
--     garder l'historique du budget passé) et on crée une nouvelle version pour
--     p_month, PUIS on repointe les transactions du mois courant et suivants
--     vers la nouvelle version.
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

  -- Cas 1 : version courante déjà effective ce mois-ci → update en place.
  if v_cur.valid_from >= p_month then
    update public.subcategories
       set name = btrim(p_name), budget = p_budget
     where id = p_id
    returning * into v_new;
    return v_new;
  end if;

  -- Cas 2 : la version courante vient d'un mois antérieur → on la fige et on
  -- crée une nouvelle version pour p_month.
  insert into public.subcategories (user_id, category_id, name, budget, sort_order, valid_from, valid_to, envelope, excluded)
  values (auth.uid(), v_cur.category_id, btrim(p_name), p_budget, v_cur.sort_order, p_month, null, v_cur.envelope, v_cur.excluded)
  returning * into v_new;

  update public.subcategories
     set valid_to = to_char((p_month || '-01')::date - interval '1 month', 'YYYY-MM')
   where id = p_id;

  -- Repointe les transactions du mois courant (et suivants) vers la nouvelle
  -- version, sinon elles resteraient sur l'ancienne (invalide pour ces mois).
  update public.transactions
     set category = v_new.id::text
   where category = p_id::text
     and to_char(coalesce(accounting_date, date::date), 'YYYY-MM') >= p_month;

  return v_new;
end;
$function$;

revoke execute on function public.version_subcategory_budget(uuid, text, numeric, text) from public, anon;
grant execute on function public.version_subcategory_budget(uuid, text, numeric, text) to authenticated;
