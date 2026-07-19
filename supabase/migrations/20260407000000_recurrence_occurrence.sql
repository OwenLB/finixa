-- Ajout de recurrence_occurrence à la table transactions
-- Identifie précisément quelle occurrence d'une récurrence a été pointée.
-- Format par fréquence :
--   monthly     → YYYY-MM          ex: 2024-01
--   weekly      → YYYY-WXX (ISO)   ex: 2024-W03
--   quarterly   → YYYY-QX          ex: 2024-Q1
--   yearly      → YYYY             ex: 2024

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurrence_occurrence TEXT NULL;

-- Contrainte d'unicité partielle : une seule transaction réelle par occurrence de récurrence.
-- WHERE filtre les lignes sans récurrence (les deux colonnes doivent être non-nulles).
CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurrence_occurrence_key
  ON public.transactions (recurring_id, recurrence_occurrence)
  WHERE recurring_id IS NOT NULL AND recurrence_occurrence IS NOT NULL;
