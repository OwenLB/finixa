-- Calcule le "reste à dépenser par jour" pour les catégories variables (type = 'depense', is_variable = true)
-- Formule : (budget_variable_total - dépenses_variable_total) / jours_restants_dans_le_mois
CREATE OR REPLACE FUNCTION get_variable_daily_remaining(p_month text)
RETURNS TABLE(
  variable_budget numeric,
  variable_spent  numeric,
  remaining       numeric,
  days_remaining  int,
  daily_remaining numeric
)
LANGUAGE sql
AS $$
  WITH
  -- Catégories variables dépenses (RLS filtre déjà sur l'utilisateur courant)
  var_cats AS (
    SELECT c.id, c.name
    FROM categories c
    WHERE c.is_variable = true
      AND c.type = 'depense'
  ),
  -- Budget total des sous-catégories de ces catégories pour le mois
  var_budget AS (
    SELECT COALESCE(SUM(s.budget), 0)::numeric AS total
    FROM subcategories s
    JOIN var_cats vc ON s.category_id = vc.id
    WHERE s.budget IS NOT NULL
      AND s.valid_from <= p_month
      AND (s.valid_to IS NULL OR s.valid_to >= p_month)
  ),
  -- Toutes les transactions du mois (réelles + virtuelles récurrentes)
  all_tx AS (
    SELECT amount, type, category, categorized
    FROM transactions
    WHERE to_char(COALESCE(accounting_date, date::date), 'YYYY-MM') = p_month
    UNION ALL
    SELECT amount, type, category, categorized
    FROM recurring_virtual_for_month(p_month)
  ),
  -- Dépenses imputées aux catégories variables (directes sur catégorie ou via sous-catégorie)
  var_spent AS (
    SELECT COALESCE(SUM(ABS(t.amount)), 0)::numeric AS total
    FROM all_tx t
    WHERE t.type = 'depense'
      AND t.categorized = true
      AND (
        t.category IN (SELECT name FROM var_cats)
        OR EXISTS (
          SELECT 1
          FROM subcategories sx
          JOIN var_cats vc ON sx.category_id = vc.id
          WHERE sx.id::text = t.category
            AND sx.valid_from <= p_month
            AND (sx.valid_to IS NULL OR sx.valid_to >= p_month)
        )
      )
  ),
  -- Jours restants dans le mois (minimum 1 pour éviter la division par zéro)
  date_calc AS (
    SELECT GREATEST(
      EXTRACT(day FROM (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day'))::int
        - EXTRACT(day FROM CURRENT_DATE)::int + 1,
      1
    )::int AS days_rem
  )
  SELECT
    vb.total                                                AS variable_budget,
    vs.total                                               AS variable_spent,
    vb.total - vs.total                                    AS remaining,
    dc.days_rem                                            AS days_remaining,
    CASE
      WHEN dc.days_rem <= 1 THEN vb.total - vs.total
      ELSE (vb.total - vs.total) / dc.days_rem
    END                                                    AS daily_remaining
  FROM var_budget vb, var_spent vs, date_calc dc
$$;
