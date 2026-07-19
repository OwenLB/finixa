-- Pointage en masse : accounting_date = date::date (date de base de chaque transaction)
CREATE OR REPLACE FUNCTION bulk_check_transactions(p_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.transactions
  SET    status          = 'checked',
         accounting_date = date::date
  WHERE  id = ANY(p_ids)
    AND  user_id = auth.uid();
$$;
