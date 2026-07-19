-- Correction de recurring_virtual_for_month :
-- 1. already_covered utilise la date réelle (pas accounting_date) pour éviter le double comptage
-- 2. Deux comptages séparés : covered_same (même mois) et covered_next (mois précédent)
--    selon l'accounting_offset de chaque récurrence

CREATE OR REPLACE FUNCTION recurring_virtual_for_month(p_month text)
RETURNS TABLE(amount numeric, type text, category text, categorized boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start date := (p_month || '-01')::date;
  v_month_end   date := v_month_start + interval '1 month';
  v_prev_start  date := v_month_start - interval '1 month';
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
      -- Couverture same_month : occurrence réelle dans [v_month_start, v_month_end)
      COALESCE(rc_same.cnt, 0)::int AS covered_same,
      -- Couverture next_month : occurrence réelle dans [v_prev_start, v_month_start)
      COALESCE(rc_next.cnt, 0)::int AS covered_next
    FROM recurring_transactions r
    LEFT JOIN (
      SELECT t.recurring_id, COUNT(*) AS cnt
      FROM transactions t
      WHERE t.recurring_id IS NOT NULL
        AND t.date >= v_month_start::timestamptz
        AND t.date <  v_month_end::timestamptz
      GROUP BY t.recurring_id
    ) rc_same ON rc_same.recurring_id = r.id
    LEFT JOIN (
      SELECT t.recurring_id, COUNT(*) AS cnt
      FROM transactions t
      WHERE t.recurring_id IS NOT NULL
        AND t.date >= v_prev_start::timestamptz
        AND t.date <  v_month_start::timestamptz
      GROUP BY t.recurring_id
    ) rc_next ON rc_next.recurring_id = r.id
    WHERE r.start_date < v_month_end
      AND (r.end_date IS NULL OR r.end_date >= v_prev_start)
      AND (r.end_date IS NULL OR r.end_date >= r.start_date)
  LOOP
    IF COALESCE(rec.accounting_offset, 'same_month') = 'next_month' THEN
      v_occ_start := v_prev_start;
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

    IF COALESCE(rec.accounting_offset, 'same_month') = 'next_month' THEN
      v_virtual := GREATEST(0, v_total - rec.covered_next);
    ELSE
      v_virtual := GREATEST(0, v_total - rec.covered_same);
    END IF;

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
