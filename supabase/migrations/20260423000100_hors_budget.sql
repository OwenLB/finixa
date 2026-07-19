-- Ajoute la colonne hors_budget sur les transactions.
-- Une transaction hors_budget est enregistrée avec sa catégorie (historique intact)
-- mais n'entre pas dans les calculs de budget mensuel ni dans les stats de catégorie.
-- Typiquement : gros achat ponctuel financé par l'épargne (ex : moto, électroménager).

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS hors_budget BOOLEAN NOT NULL DEFAULT false;

-- Toutes les fonctions de stats sont mises à jour pour exclure hors_budget = true.
-- Les transactions récurrentes virtuelles ne peuvent pas être hors_budget.

CREATE OR REPLACE FUNCTION get_dashboard_month(p_month text)
RETURNS TABLE(type text, spent numeric, budget numeric)
LANGUAGE sql
AS $$
  WITH tx_spent AS (
    SELECT t.type, SUM(ABS(t.amount)) AS spent
    FROM transactions t
    WHERE to_char(COALESCE(t.accounting_date, t.date::date), 'YYYY-MM') = p_month
      AND t.hors_budget = false
    GROUP BY t.type
    UNION ALL
    SELECT rv.type, SUM(ABS(rv.amount)) AS spent
    FROM recurring_virtual_for_month(p_month) rv
    GROUP BY rv.type
  ),
  tx_combined AS (
    SELECT type, SUM(spent) AS spent FROM tx_spent GROUP BY type
  ),
  cat_budget AS (
    SELECT c.type, COALESCE(SUM(s.budget), 0) AS budget
    FROM categories c
    LEFT JOIN subcategories s
      ON  s.category_id = c.id
      AND s.valid_from <= p_month
      AND (s.valid_to IS NULL OR s.valid_to >= p_month)
    GROUP BY c.type
  )
  SELECT
    COALESCE(tx.type, cb.type) AS type,
    COALESCE(tx.spent,  0)     AS spent,
    COALESCE(cb.budget, 0)     AS budget
  FROM tx_combined tx
  FULL OUTER JOIN cat_budget cb USING (type)
  ORDER BY type
$$;

CREATE OR REPLACE FUNCTION get_subcategory_stats(p_month text)
RETURNS TABLE(subcategory_id uuid, spent numeric, tx_count bigint)
LANGUAGE sql
AS $$
  WITH all_tx AS (
    SELECT amount, type, category, categorized
    FROM transactions
    WHERE to_char(COALESCE(accounting_date, date::date), 'YYYY-MM') = p_month
      AND hors_budget = false
    UNION ALL
    SELECT amount, type, category, categorized
    FROM recurring_virtual_for_month(p_month)
  )
  SELECT
    s.id AS subcategory_id,
    COALESCE(SUM(ABS(t.amount)), 0)::numeric AS spent,
    COUNT(t.amount)::bigint                  AS tx_count
  FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  LEFT JOIN all_tx t ON
    t.type        = c.type
    AND t.categorized = true
    AND s.id::text = t.category
  WHERE s.valid_from <= p_month
    AND (s.valid_to IS NULL OR s.valid_to >= p_month)
  GROUP BY s.id
$$;

CREATE OR REPLACE FUNCTION get_category_spent(p_month text)
RETURNS TABLE(category_id uuid, total_spent numeric, direct_spent numeric, direct_count bigint)
LANGUAGE sql
AS $$
  WITH all_tx AS (
    SELECT amount, type, category, categorized
    FROM transactions
    WHERE to_char(COALESCE(accounting_date, date::date), 'YYYY-MM') = p_month
      AND hors_budget = false
    UNION ALL
    SELECT amount, type, category, categorized
    FROM recurring_virtual_for_month(p_month)
  )
  SELECT
    c.id AS category_id,
    COALESCE(SUM(ABS(t.amount)), 0)::numeric                                         AS total_spent,
    COALESCE(SUM(CASE WHEN sn.id IS NULL THEN ABS(t.amount) ELSE 0 END), 0)::numeric AS direct_spent,
    COUNT(CASE WHEN sn.id IS NULL THEN 1 END)::bigint                                AS direct_count
  FROM categories c
  LEFT JOIN all_tx t ON
    t.type = c.type
    AND t.categorized = true
    AND (
      t.category = c.name
      OR EXISTS (
        SELECT 1 FROM subcategories sx
        WHERE sx.category_id = c.id
          AND sx.id::text    = t.category
          AND sx.valid_from <= p_month
          AND (sx.valid_to IS NULL OR sx.valid_to >= p_month)
      )
    )
  LEFT JOIN subcategories sn ON
    sn.category_id = c.id
    AND sn.id::text = t.category
    AND sn.valid_from <= p_month
    AND (sn.valid_to IS NULL OR sn.valid_to >= p_month)
  WHERE true
  GROUP BY c.id
$$;

CREATE OR REPLACE FUNCTION get_envelope_stats(p_month text)
RETURNS TABLE(envelope text, spent numeric, tx_count bigint)
LANGUAGE sql
AS $$
  WITH all_tx AS (
    SELECT amount, type, category, categorized
    FROM transactions
    WHERE to_char(COALESCE(accounting_date, date::date), 'YYYY-MM') = p_month
      AND hors_budget = false
    UNION ALL
    SELECT amount, type, category, categorized
    FROM recurring_virtual_for_month(p_month)
  )
  SELECT
    s.envelope,
    COALESCE(SUM(ABS(t.amount)), 0)::numeric AS spent,
    COUNT(t.amount)::bigint                  AS tx_count
  FROM subcategories s
  JOIN categories c ON c.id = s.category_id
  JOIN all_tx t ON
    t.type        = c.type
    AND t.categorized = true
    AND s.id::text = t.category
  WHERE s.envelope IS NOT NULL
    AND s.valid_from <= p_month
    AND (s.valid_to IS NULL OR s.valid_to >= p_month)
  GROUP BY s.envelope
$$;

CREATE OR REPLACE FUNCTION get_uncategorized_stats(p_month text)
RETURNS TABLE(type text, spent numeric, tx_count bigint)
LANGUAGE sql
AS $$
  SELECT
    t.type,
    COALESCE(SUM(ABS(t.amount)), 0)::numeric AS spent,
    COUNT(*)::bigint                          AS tx_count
  FROM (
    SELECT amount, type, categorized FROM transactions
    WHERE to_char(COALESCE(accounting_date, date::date), 'YYYY-MM') = p_month
      AND hors_budget = false
    UNION ALL
    SELECT amount, type, categorized FROM recurring_virtual_for_month(p_month)
  ) t
  WHERE t.categorized = false
  GROUP BY t.type
$$;

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
  var_cats AS (
    SELECT c.id, c.name
    FROM categories c
    WHERE c.is_variable = true
      AND c.type = 'depense'
  ),
  var_budget AS (
    SELECT COALESCE(SUM(s.budget), 0)::numeric AS total
    FROM subcategories s
    JOIN var_cats vc ON s.category_id = vc.id
    WHERE s.budget IS NOT NULL
      AND s.valid_from <= p_month
      AND (s.valid_to IS NULL OR s.valid_to >= p_month)
  ),
  all_tx AS (
    SELECT amount, type, category, categorized
    FROM transactions
    WHERE to_char(COALESCE(accounting_date, date::date), 'YYYY-MM') = p_month
      AND hors_budget = false
    UNION ALL
    SELECT amount, type, category, categorized
    FROM recurring_virtual_for_month(p_month)
  ),
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
