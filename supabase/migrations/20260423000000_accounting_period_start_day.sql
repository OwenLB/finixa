-- Période comptable personnalisable : jour de début de période (ex: 25 → du 25 au 24 du mois suivant)
-- Par défaut : 1 (comportement calendaire standard)

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS accounting_period_start_day SMALLINT NOT NULL DEFAULT 1
    CHECK (accounting_period_start_day >= 1 AND accounting_period_start_day <= 31);

-- Rejeu propre des migrations (CI / `supabase db start`) : on retire la surcharge
-- 1-arg de recurring_virtual_for_month avant de créer la version 3-args ci-dessous.
-- Sinon les fonctions de stats (recréées juste après et dans hors_budget) qui
-- appellent recurring_virtual_for_month(p_month) à 1 argument deviennent ambiguës
-- entre la 1-arg (20260420) et la 3-args à défauts NULL (erreur 42725, cf. DB-C1).
-- IF EXISTS → sans effet en prod (la 1-arg y avait déjà été supprimée à la main).
DROP FUNCTION IF EXISTS public.recurring_virtual_for_month(text);

-- recurring_virtual_for_month : accepte maintenant p_start/p_end optionnels
-- Si non fournis, repli sur le comportement calendaire (compatible avec l'existant)
CREATE OR REPLACE FUNCTION recurring_virtual_for_month(
  p_month text,
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
)
RETURNS TABLE(amount numeric, type text, category text, categorized boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start       date := COALESCE(p_start, (p_month || '-01')::date);
  v_end         date := COALESCE(p_end,   (p_month || '-01')::date + interval '1 month');
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
        AND COALESCE(t.accounting_date, t.date::date) >= v_start
        AND COALESCE(t.accounting_date, t.date::date) <  v_end
      GROUP BY t.recurring_id
    ) rc ON rc.recurring_id = r.id
    WHERE r.start_date < v_end
      AND (r.end_date IS NULL OR r.end_date >= v_start - interval '1 month')
      AND (r.end_date IS NULL OR r.end_date >= r.start_date)
  LOOP
    IF COALESCE(rec.accounting_offset, 'same_month') = 'next_month' THEN
      v_occ_start := v_start - interval '1 month';
      v_occ_end   := v_start;
    ELSE
      v_occ_start := v_start;
      v_occ_end   := v_end;
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

-- get_dashboard_month : accepte p_start/p_end optionnels
CREATE OR REPLACE FUNCTION get_dashboard_month(
  p_month text,
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
)
RETURNS TABLE(type text, spent numeric, budget numeric)
LANGUAGE sql
AS $$
  WITH
  v AS (
    SELECT
      COALESCE(p_start, (p_month || '-01')::date)                             AS v_start,
      COALESCE(p_end,   (p_month || '-01')::date + interval '1 month')::date  AS v_end
  ),
  tx_spent AS (
    SELECT t.type, SUM(ABS(t.amount)) AS spent
    FROM transactions t, v
    WHERE COALESCE(t.accounting_date, t.date::date) >= v.v_start
      AND COALESCE(t.accounting_date, t.date::date) <  v.v_end
    GROUP BY t.type
    UNION ALL
    SELECT rv.type, SUM(ABS(rv.amount)) AS spent
    FROM v, recurring_virtual_for_month(p_month, v.v_start, v.v_end) rv
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

-- get_subcategory_stats : accepte p_start/p_end optionnels
CREATE OR REPLACE FUNCTION get_subcategory_stats(
  p_month text,
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
)
RETURNS TABLE(subcategory_id uuid, spent numeric, tx_count bigint)
LANGUAGE sql
AS $$
  WITH
  v AS (
    SELECT
      COALESCE(p_start, (p_month || '-01')::date)                             AS v_start,
      COALESCE(p_end,   (p_month || '-01')::date + interval '1 month')::date  AS v_end
  ),
  all_tx AS (
    SELECT amount, type, category, categorized
    FROM transactions, v
    WHERE COALESCE(accounting_date, date::date) >= v.v_start
      AND COALESCE(accounting_date, date::date) <  v.v_end
    UNION ALL
    SELECT amount, type, category, categorized
    FROM v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
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

-- get_category_spent : accepte p_start/p_end optionnels
CREATE OR REPLACE FUNCTION get_category_spent(
  p_month text,
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
)
RETURNS TABLE(category_id uuid, total_spent numeric, direct_spent numeric, direct_count bigint)
LANGUAGE sql
AS $$
  WITH
  v AS (
    SELECT
      COALESCE(p_start, (p_month || '-01')::date)                             AS v_start,
      COALESCE(p_end,   (p_month || '-01')::date + interval '1 month')::date  AS v_end
  ),
  all_tx AS (
    SELECT amount, type, category, categorized
    FROM transactions, v
    WHERE COALESCE(accounting_date, date::date) >= v.v_start
      AND COALESCE(accounting_date, date::date) <  v.v_end
    UNION ALL
    SELECT amount, type, category, categorized
    FROM v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
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

-- get_envelope_stats : accepte p_start/p_end optionnels
CREATE OR REPLACE FUNCTION get_envelope_stats(
  p_month text,
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
)
RETURNS TABLE(envelope text, spent numeric, tx_count bigint)
LANGUAGE sql
AS $$
  WITH
  v AS (
    SELECT
      COALESCE(p_start, (p_month || '-01')::date)                             AS v_start,
      COALESCE(p_end,   (p_month || '-01')::date + interval '1 month')::date  AS v_end
  ),
  all_tx AS (
    SELECT amount, type, category, categorized
    FROM transactions, v
    WHERE COALESCE(accounting_date, date::date) >= v.v_start
      AND COALESCE(accounting_date, date::date) <  v.v_end
    UNION ALL
    SELECT amount, type, category, categorized
    FROM v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
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

-- get_uncategorized_stats : accepte p_start/p_end optionnels
CREATE OR REPLACE FUNCTION get_uncategorized_stats(
  p_month text,
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
)
RETURNS TABLE(type text, spent numeric, tx_count bigint)
LANGUAGE sql
AS $$
  WITH
  v AS (
    SELECT
      COALESCE(p_start, (p_month || '-01')::date)                             AS v_start,
      COALESCE(p_end,   (p_month || '-01')::date + interval '1 month')::date  AS v_end
  )
  SELECT
    t.type,
    COALESCE(SUM(ABS(t.amount)), 0)::numeric AS spent,
    COUNT(*)::bigint                          AS tx_count
  FROM (
    SELECT amount, type, categorized FROM transactions, v
    WHERE COALESCE(accounting_date, date::date) >= v.v_start
      AND COALESCE(accounting_date, date::date) <  v.v_end
    UNION ALL
    SELECT amount, type, categorized FROM v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
  ) t
  WHERE t.categorized = false
  GROUP BY t.type
$$;

-- get_variable_daily_remaining : accepte p_start/p_end optionnels
-- Les "jours restants" sont recalculés par rapport à la fin de la période personnalisée
CREATE OR REPLACE FUNCTION get_variable_daily_remaining(
  p_month text,
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
)
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
  v AS (
    SELECT
      COALESCE(p_start, (p_month || '-01')::date)                             AS v_start,
      COALESCE(p_end,   (p_month || '-01')::date + interval '1 month')::date  AS v_end
  ),
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
    FROM transactions, v
    WHERE COALESCE(accounting_date, date::date) >= v.v_start
      AND COALESCE(accounting_date, date::date) <  v.v_end
    UNION ALL
    SELECT amount, type, category, categorized
    FROM v, recurring_virtual_for_month(p_month, v.v_start, v.v_end)
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
      (SELECT v_end FROM v) - CURRENT_DATE,
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
