import type { Transaction, TransactionType } from '~/types'

export interface DashboardSummary {
  /** Montant total absolu par type (réel + virtuel), hors transactions hors-budget */
  spentByType: Map<TransactionType, number>
  /** Part « exclue des calculs » par type (ex. désépargne sur le type revenu) */
  excludedByType: Map<TransactionType, number>
  /** Revenus normaux prévus (hors exclus) — référence (budget) de la gauge */
  ringIncome: number
  /** Dépenses réelles pointées (uniquement type 'depense') */
  spentReel: number
  /** Dépenses prévisionnelles (réelles + virtuelles) */
  spentPrev: number
  /** Solde réel pointé — INCLUT la désépargne (l'argent est bien arrivé) */
  soldeReel: number
  /** Solde prévisionnel — EXCLUT la désépargne (prévision « propre ») */
  soldePrev: number
}

type ExcludedPredicate = (tx: Pick<Transaction, 'category' | 'type'>) => boolean

/**
 * Calcule les agrégats affichés dans la carte résumé du dashboard à partir de la
 * liste plate des transactions (réelles + virtuelles dédupliquées).
 *
 * Deux règles métier :
 *  1. La gauge ("Dépenses du mois") ne compte que les dépenses (`depense`).
 *     L'épargne n'est pas une dépense — l'inclure gonflait la jauge et la faisait
 *     passer au rouge alors que le budget dépenses était respecté.
 *  2. Une catégorie « exclue des calculs » (ex. désépargne — virement sortant du
 *     Livret) est retirée de la gauge, du budget de référence (ringIncome) et du
 *     prévisionnel, mais reste comptée dans le solde RÉEL (l'argent est arrivé).
 *     Son montant est isolé dans `excludedByType` pour l'affichage (segment rouge).
 */
export function computeDashboardSummary(
  transactions: Transaction[],
  isExcluded: ExcludedPredicate = () => false,
): DashboardSummary {
  const budgetTxs = transactions.filter(tx => !tx.horsBudget)

  const spentByType    = new Map<TransactionType, number>()
  const excludedByType = new Map<TransactionType, number>()
  for (const tx of budgetTxs) {
    const target = isExcluded(tx) ? excludedByType : spentByType
    target.set(tx.type, (target.get(tx.type) ?? 0) + Math.abs(tx.amount))
  }

  const checkedTxs = budgetTxs.filter(tx => tx.status === 'checked' && !tx.virtual)

  // Revenu de référence pour la jauge = revenus normaux, hors part exclue (désépargne)
  const ringIncome = spentByType.get('revenu') ?? 0

  const spentReel = checkedTxs
    .filter(tx => tx.type === 'depense')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const spentPrev = spentByType.get('depense') ?? 0

  // Réel : tout le pointé, désépargne incluse
  const soldeReel = checkedTxs.reduce((sum, tx) => sum + tx.amount, 0)
  // Prévisionnel : tous les mouvements SAUF les exclus (désépargne)
  const soldePrev = budgetTxs
    .filter(tx => !isExcluded(tx))
    .reduce((sum, tx) => sum + tx.amount, 0)

  return { spentByType, excludedByType, ringIncome, spentReel, spentPrev, soldeReel, soldePrev }
}
