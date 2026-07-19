export type BudgetAlertLevel = 'green' | 'orange' | 'red'

/**
 * Alert level for a variable budget category based on spending trajectory.
 *
 * progressRatio — fraction of the billing period elapsed (0–1). Use the
 * actual period bounds (not a raw calendar ratio) so custom start-days
 * (e.g. "25th of the month") are handled correctly.
 *
 * Thresholds match the CategoryCards dot logic:
 *   green  → spending pace ≤ time elapsed + 15 %  (on track)
 *   orange → spending pace ≤ time elapsed + 30 %  (slightly ahead)
 *   red    → spending pace  > time elapsed + 30 %  OR over budget
 */
export function variableBudgetAlert(
  spent:         number,
  budget:        number,
  progressRatio: number,
): BudgetAlertLevel | null {
  if (budget <= 0 || spent <= 0) return null
  if (spent > budget) return 'red'

  // Période future (progressRatio = 0) : la notion de trajectoire n'a pas de
  // sens avant que la période commence. On signale uniquement un dépassement
  // réel, déjà capturé ci-dessus.
  if (progressRatio <= 0) return null

  const ratioBudget = spent / budget
  if (ratioBudget <= progressRatio + 0.15) return 'green'
  if (ratioBudget <= progressRatio + 0.30) return 'orange'
  return 'red'
}
