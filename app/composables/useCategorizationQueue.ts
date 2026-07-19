/**
 * Logique métier de la swipe queue de catégorisation.
 *
 * La queue est constituée de TOUTES les transactions réelles non catégorisées,
 * toutes périodes confondues (pas de filtre de date), afin d'inclure les
 * imports CSV de mois passés.
 * L'utilisateur peut valider (catégoriser) ou passer (skip) chaque item.
 * Les items skippés disparaissent simplement de la queue active et peuvent
 * être retraités en réinitialisant.
 */
import { ref, computed } from 'vue'
import { useTransactionStore } from '~/stores/useTransactionStore'
import type { Transaction, TransactionType } from '~/types'
import type { LocalSuggestion } from '~/composables/useLocalSuggestion'
import { fetchUncategorizedTransactions } from '~/services/transactionService'

export function useCategorizationQueue() {
  const store    = useTransactionStore()
  const supabase = useSupabaseClient()

  // Map txId → suggestion chargée en bulk à l'entrée du workflow
  const suggestionsMap = ref(new Map<string, LocalSuggestion>())

  // IDs temporairement skippés (réinitialisés à l'ouverture)
  const skippedIds = ref<Set<string>>(new Set())

  // Total figé au moment de l'ouverture (pour la progress bar)
  const initialTotal = ref(0)

  // Chargement initial
  const loading = ref(false)
  const error   = ref<string | null>(null)

  // Toutes les transactions non catégorisées (requête indépendante, sans filtre de période)
  const allUncategorized = ref<Transaction[]>([])

  // Queue active : non skippées, ordre chronologique (plus ancienne en premier)
  const queue = computed(() =>
    allUncategorized.value
      .filter(tx => !skippedIds.value.has(tx.id))
      .sort((a, b) => a.date.localeCompare(b.date))
  )

  const current   = computed(() => queue.value[0] ?? null)
  const remaining = computed(() => allUncategorized.value.length)

  // Progression : combien ont été validées depuis l'ouverture
  const validated = computed(() => Math.max(0, initialTotal.value - allUncategorized.value.length))

  // Plus rien dans la queue (tout validé ou tout skipé)
  const isDone = computed(() => queue.value.length === 0)

  // Tout validé (plus aucune non catégorisée)
  const allCategorized = computed(() => allUncategorized.value.length === 0)

  // Encore des non catégorisées mais toutes skippées
  const allSkipped = computed(() => isDone.value && allUncategorized.value.length > 0)

  const skippedCount = computed(() =>
    [...skippedIds.value].filter(id => allUncategorized.value.some(tx => tx.id === id)).length
  )

  async function fetchUncategorized() {
    allUncategorized.value = await fetchUncategorizedTransactions(supabase)
  }

  async function fetchSuggestions() {
    const txs = allUncategorized.value
    if (!txs.length) return

    const names = [...new Set(txs.map(tx => tx.name).filter(n => n.trim().length >= 2))]
    if (!names.length) return

    const { data } = await supabase.rpc('get_category_suggestions_bulk', { p_names: names })
    if (!data) return

    // Construit name → suggestion depuis la réponse
    const byName = new Map<string, LocalSuggestion>(
      (data as { input_name: string; subcategory_id: string; type: string }[]).map(row => [
        row.input_name,
        { category: row.subcategory_id, type: row.type as TransactionType },
      ])
    )

    // Associe chaque transaction à sa suggestion par nom
    const map = new Map<string, LocalSuggestion>()
    for (const tx of txs) {
      const s = byName.get(tx.name)
      if (s) map.set(tx.id, s)
    }
    suggestionsMap.value = map
  }

  /** Valide la transaction courante avec la catégorie choisie. */
  async function validate(category: string, type: TransactionType) {
    if (!current.value) return
    const id   = current.value.id
    const name = current.value.name
    try {
      // Délègue au store : service + mise à jour du cache de la période courante
      await store.bulkSetCategory([id], category, true, type)
      allUncategorized.value = allUncategorized.value.filter(tx => tx.id !== id)
      // Propage la suggestion aux transactions restantes au nom similaire
      propagateSuggestion(name, category, type)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la catégorisation'
      throw e
    }
  }

  /**
   * Après une validation, propage la catégorie choisie à toutes les transactions
   * restantes dont le nom partage au moins un mot significatif (≥ 4 chars).
   * Ex : "Loyer janvier" catégorisé → "Loyer février" reçoit la même suggestion.
   */
  function propagateSuggestion(sourceName: string, category: string, type: TransactionType) {
    const remaining = allUncategorized.value
    if (!remaining.length) return

    const updatedMap = new Map(suggestionsMap.value)
    let changed = false

    for (const tx of remaining) {
      if (suggestionsMap.value.has(tx.id)) continue   // ne pas écraser les suggestions DB
      if (namesAreSimilar(sourceName, tx.name)) {
        updatedMap.set(tx.id, { category, type })
        changed = true
      }
    }

    if (changed) suggestionsMap.value = updatedMap
  }

  /** Deux noms sont similaires s'ils partagent un mot normalisé de ≥ 4 caractères. */
  function namesAreSimilar(a: string, b: string): boolean {
    const normalize = (s: string) =>
      s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

    const na = normalize(a)
    const nb = normalize(b)
    if (na === nb) return true

    const words = (s: string) => new Set(s.split(/[\s\W]+/).filter(w => w.length >= 4))
    const wa = words(na)
    const wb = words(nb)
    if (!wa.size || !wb.size) return false
    for (const w of wa) if (wb.has(w)) return true
    return false
  }

  /** Passe la transaction courante (reste non catégorisée). */
  function skip() {
    if (!current.value) return
    skippedIds.value = new Set([...skippedIds.value, current.value.id])
  }

  /** Réinitialise les skips (pour retravailler les items passés). */
  function reset() {
    skippedIds.value = new Set()
  }

  /** À appeler à l'ouverture : charge toutes les non catégorisées, fige le total, précharge les suggestions. */
  async function init() {
    loading.value    = true
    error.value      = null
    skippedIds.value = new Set()
    suggestionsMap.value = new Map()
    try {
      await fetchUncategorized()
      initialTotal.value = allUncategorized.value.length
      // Charge toutes les suggestions en une seule requête
      await fetchSuggestions()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement de la queue'
    } finally {
      loading.value = false
    }
  }

  return {
    queue,
    current,
    remaining,
    validated,
    initialTotal,
    isDone,
    allCategorized,
    allSkipped,
    skippedCount,
    suggestionsMap,
    loading,
    error,
    validate,
    skip,
    reset,
    init,
  }
}
