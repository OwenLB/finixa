-- accounting_date (DATE, nullable) sur transactions :
--   si renseigné, la tx est comptabilisée sur le mois de cette date
--   sinon on utilise COALESCE(accounting_date, date::date) partout
--
-- accounting_offset sur recurring_transactions :
--   'same_month' (défaut) — comportement inchangé
--   'next_month'          — accounting_date = 1er du mois suivant l'occurrence

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS accounting_date DATE NULL;

ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS accounting_offset TEXT NOT NULL DEFAULT 'same_month';

-- recurring_virtual_for_month : supporte accounting_offset
-- - already_covered utilise COALESCE(accounting_date, date::date)
-- - la fenêtre d'occurrence est décalée d'un mois pour next_month
CREATE OR REPLACE FUNCTION recurring_virtual_for_month(p_month text)
RETURNS TABLE(amount numeric, type text, category text, categorized boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start date := (p_month || '-01')::date;
  v_month_end   date := v_month_start + interval '1 month';
  v_occ_start   date;
  v_occ_end     date;
  rec           record;
  v_total       int;
  v_virtual     int;
  v_first_occ   date;
  v_eff_end     date;
  v_occ_date    date;
  i             int;
BEGIN
  FOR rec IN
    SELECT
      r.*,
      COALESCE(rc.cnt, 0)::int AS already_covered
    FROM recurring_transactions r
    LEFT JOIN (
      SELECT t.recurring_id, COUNT(*) AS cnt
      FROM transactions t
      WHERE t.recurring_id IS NOT NULL
        AND COALESCE(t.accounting_date, t.date::date) >= v_month_start
        AND COALESCE(t.accounting_date, t.date::date) <  v_month_end
      GROUP BY t.recurring_id
    ) rc ON rc.recurring_id = r.id
    WHERE r.start_date < v_month_end
      AND (r.end_date IS NULL OR r.end_date >= v_month_start - interval '1 month')
      AND (r.end_date IS NULL OR r.end_date >= r.start_date)
  LOOP
    IF COALESCE(rec.accounting_offset, 'same_month') = 'next_month' THEN
      v_occ_start := v_month_start - interval '1 month';
      v_occ_end   := v_month_start;
    ELSE
      v_occ_start := v_month_start;
      v_occ_end   := v_month_end;
    END IF;

    IF rec.start_date >= v_occ_end THEN CONTINUE; END IF;
    IF rec.end_date IS NOT NULL AND rec.end_date < v_occ_start THEN CONTINUE; END IF;

    IF rec.frequency = 'monthly' THEN
      v_occ_date := (v_occ_start + MAKE_INTERVAL(days =>
        LEAST(
          EXTRACT(day FROM rec.start_date)::int,
          EXTRACT(day FROM (v_occ_end - interval '1 day'))::int
        ) - 1
      ))::date;
      v_total := CASE
        WHEN v_occ_date >= rec.start_date
         AND v_occ_date >= v_occ_start
         AND v_occ_date < v_occ_end
         AND (rec.end_date IS NULL OR v_occ_date <= rec.end_date)
        THEN 1
        ELSE 0
      END;

    ELSIF rec.frequency = 'yearly' THEN
      v_total := CASE
        WHEN EXTRACT(month FROM rec.start_date) = EXTRACT(month FROM v_occ_start) THEN 1
        ELSE 0
      END;

    ELSIF rec.frequency = 'weekly' THEN
      v_first_occ := CASE
        WHEN rec.start_date >= v_occ_start THEN rec.start_date
        ELSE rec.start_date + (CEIL((v_occ_start - rec.start_date)::numeric / 7) * 7)::int
      END;
      v_eff_end := CASE
        WHEN rec.end_date IS NOT NULL AND rec.end_date < v_occ_end - 1
          THEN rec.end_date + 1
        ELSE v_occ_end
      END;
      v_total := CASE
        WHEN v_first_occ < v_eff_end
          THEN FLOOR((v_eff_end - v_first_occ - 1)::numeric / 7)::int + 1
        ELSE 0
      END;

    ELSE
      v_total := 0;
    END IF;

    v_virtual := GREATEST(0, v_total - rec.already_covered);

    FOR i IN 1..v_virtual LOOP
      amount      := rec.amount;
      type        := rec.type;
      category    := rec.category;
      categorized := rec.categorized;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$;

-- Stats RPCs : filtrer sur COALESCE(accounting_date, date::date)
CREATE OR REPLACE FUNCTION get_dashboard_month(p_month text)
RETURNS TABLE(type text, spent numeric, budget numeric)
LANGUAGE sql
AS $$
  WITH tx_spent AS (
    SELECT t.type, SUM(ABS(t.amount)) AS spent
    FROM transactions t
    WHERE to_char(COALESCE(t.accounting_date, t.date::date), 'YYYY-MM') = p_month
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
    UNION ALL
    SELECT amount, type, categorized FROM recurring_virtual_for_month(p_month)
  ) t
  WHERE t.categorized = false
  GROUP BY t.type
$$;
