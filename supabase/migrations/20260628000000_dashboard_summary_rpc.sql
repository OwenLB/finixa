-- ============================================================================
-- get_dashboard_summary : agrégats du dashboard calculés en SQL
--
-- Remplace le calcul JS côté client (computeDashboardSummary + buildExcludedMatcher)
-- par une requête unique. Retourne une ligne par type (depense/revenu/epargne) :
--
--   spent_prev     — |amount| non-exclu, non-hors_budget (réel + virtuel)
--   spent_excluded — |amount| catégories/sous-catégories exclues des calculs
--   spent_reel     — |amount| pointées réelles, non-exclues (utile pour depense)
--   solde_reel     — montant signé des pointées réelles, hors_budget exclu
--                    (catégories exclues INCLUSES — l'argent est bien arrivé)
--   solde_prev     — montant signé de toutes les tx non-exclues (réel + virtuel)
--   budget         — budget total du mois pour ce type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_month text,
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
)
RETURNS TABLE(
  type           text,
  spent_prev     numeric,
  spent_excluded numeric,
  spent_reel     numeric,
  solde_reel     numeric,
  solde_prev     numeric,
  budget         numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH
  v AS (
    SELECT
      COALESCE(p_start, (p_month || '-01')::date)                            AS v_start,
      COALESCE(p_end,   (p_month || '-01')::date + interval '1 month')::date AS v_end
  ),
  -- IDs de sous-catégories exclues des calculs valides pour ce mois
  -- (une catégorie parente exclue entraîne l'exclusion de toutes ses sous-catégories)
  excl_subs AS (
    SELECT sx.id::text AS sub_id
    FROM subcategories sx
    JOIN categories cx ON cx.id = sx.category_id
    WHERE (sx.excluded = true OR cx.excluded = true)
      AND sx.valid_from <= p_month
      AND (sx.valid_to IS NULL OR sx.valid_to >= p_month)
  ),
  -- Clés type:name des catégories exclues (pour transactions non catégorisées)
  excl_cats AS (
    SELECT cx.type || ':' || cx.name AS key
    FROM categories cx
    WHERE cx.excluded = true
  ),
  -- Transactions réelles de la période avec flag is_excluded
  real_tx AS (
    SELECT
      t.amount,
      t.type,
      t.status,
      false AS is_virtual,
      CASE
        WHEN t.categorized THEN t.category IN (SELECT sub_id FROM excl_subs)
        ELSE (t.type || ':' || t.category) IN (SELECT key FROM excl_cats)
      END AS is_excluded
    FROM transactions t, v
    WHERE COALESCE(t.accounting_date, t.date::date) >= v.v_start
      AND COALESCE(t.accounting_date, t.date::date) <  v.v_end
      AND t.hors_budget = false
  ),
  -- Occurrences virtuelles (récurrents non encore matérialisés)
  virt_tx AS (
    SELECT
      rv.amount,
      rv.type,
      'virtual'::text AS status,
      true            AS is_virtual,
      CASE
        WHEN rv.categorized THEN rv.category IN (SELECT sub_id FROM excl_subs)
        ELSE (rv.type || ':' || rv.category) IN (SELECT key FROM excl_cats)
      END AS is_excluded
    FROM v, recurring_virtual_for_month(p_month, v.v_start, v.v_end) rv
  ),
  -- Budget par type (sous-catégories valides pour le mois)
  cat_budget AS (
    SELECT c.type, COALESCE(SUM(s.budget), 0)::numeric AS budget
    FROM categories c
    LEFT JOIN subcategories s
      ON  s.category_id = c.id
      AND s.valid_from <= p_month
      AND (s.valid_to IS NULL OR s.valid_to >= p_month)
    GROUP BY c.type
  ),
  -- Agrégats par type
  agg AS (
    SELECT
      type,
      SUM(CASE WHEN NOT is_excluded                                                   THEN ABS(amount) ELSE 0 END)::numeric AS spent_prev,
      SUM(CASE WHEN     is_excluded                                                   THEN ABS(amount) ELSE 0 END)::numeric AS spent_excluded,
      SUM(CASE WHEN NOT is_excluded AND NOT is_virtual AND status = 'checked'         THEN ABS(amount) ELSE 0 END)::numeric AS spent_reel,
      SUM(CASE WHEN                     NOT is_virtual AND status = 'checked'         THEN amount      ELSE 0 END)::numeric AS solde_reel,
      SUM(CASE WHEN NOT is_excluded                                                   THEN amount      ELSE 0 END)::numeric AS solde_prev
    FROM (
      SELECT amount, type, status, is_virtual, is_excluded FROM real_tx
      UNION ALL
      SELECT amount, type, status, is_virtual, is_excluded FROM virt_tx
    ) all_tx
    GROUP BY type
  )
  SELECT
    COALESCE(agg.type,           cb.type)    AS type,
    COALESCE(agg.spent_prev,     0::numeric) AS spent_prev,
    COALESCE(agg.spent_excluded, 0::numeric) AS spent_excluded,
    COALESCE(agg.spent_reel,     0::numeric) AS spent_reel,
    COALESCE(agg.solde_reel,     0::numeric) AS solde_reel,
    COALESCE(agg.solde_prev,     0::numeric) AS solde_prev,
    COALESCE(cb.budget,          0::numeric) AS budget
  FROM agg
  FULL OUTER JOIN cat_budget cb USING (type)
  ORDER BY type
$$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(text, date, date) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_summary(text, date, date) TO authenticated;
