import { ref, computed } from 'vue'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useCategoryStore } from '~/stores/useCategoryStore'
import { buildAiImportPrompt } from '~/utils/aiImportPrompt'
import { parseAiImport } from '~/utils/parseAiImport'
import type { AiParsedTransaction } from '~/utils/parseAiImport'
import { filterAndSortReview, type AiSortField, type AiSortDir } from '~/utils/aiReview'
import type { TransactionType } from '~/types'

type AiPhase = 'prompt' | 'paste' | 'review' | 'importing' | 'done' | 'error'

export function useAiImport() {
  const transactionStore = useTransactionStore()
  const categoryStore     = useCategoryStore()
  const { t, locale }     = useI18n()

  const phase    = ref<AiPhase>('prompt')
  const rawInput = ref('')
  const errorMsg = ref('')

  const transactions = ref<AiParsedTransaction[]>([])
  const skipped      = ref(0)

  // Modèle aligné sur la review des récurrences : on valide / rejette ligne par ligne
  const dismissedIndexes = ref<Set<number>>(new Set())
  const acceptedIndexes  = ref<Set<number>>(new Set())
  const acceptingIndex   = ref<number | null>(null)
  const acceptingAll     = ref(false)

  const importedCount    = ref(0)
  const categorizedCount = ref(0)
  const promptCopied     = ref(false)

  const prompt = computed(() =>
    buildAiImportPrompt(categoryStore.categories, locale.value === 'en' ? 'en' : 'fr'),
  )

  // Tri & recherche de la liste de review
  const search    = ref('')
  const sortField = ref<AiSortField>('confidence')
  const sortDir   = ref<AiSortDir>('asc')

  /** Bascule le tri : même champ → inverse le sens, sinon nouveau champ (sens par défaut). */
  function toggleSort(field: AiSortField) {
    if (sortField.value === field) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortDir.value   = 'asc'
    }
  }

  // Lignes encore à traiter (ni validées ni rejetées)
  const visible = computed(() =>
    transactions.value.map((tx, i) => ({ ...tx, index: i }))
      .filter(tx => !dismissedIndexes.value.has(tx.index) && !acceptedIndexes.value.has(tx.index)),
  )

  // Lignes effectivement affichées : filtrées par recherche, puis triées
  const displayed = computed(() =>
    filterAndSortReview(visible.value, search.value, sortField.value, sortDir.value),
  )

  const reviewCount  = computed(() => visible.value.filter(tx => tx.needsReview).length)
  const depenseCount = computed(() => visible.value.filter(tx => tx.type === 'depense').length)
  const revenuCount  = computed(() => visible.value.filter(tx => tx.type === 'revenu').length)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt.value)
      promptCopied.value = true
      setTimeout(() => { promptCopied.value = false }, 2000)
    } catch { /* clipboard indisponible — ignore */ }
  }

  function parseInput() {
    const result = parseAiImport(rawInput.value, categoryStore.categories)
    if (result.error || !result.transactions.length) {
      errorMsg.value = result.error === 'invalid'
        ? t('aiImport.errorInvalid')
        : t('aiImport.errorEmpty')
      phase.value = 'error'
      return
    }
    transactions.value     = result.transactions
    skipped.value          = result.skipped
    dismissedIndexes.value = new Set()
    acceptedIndexes.value  = new Set()
    phase.value            = 'review'
  }

  function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 10_000_000) {
      errorMsg.value = t('csvImport.fileTooLarge')
      phase.value    = 'error'
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      rawInput.value = (ev.target?.result as string) ?? ''
      parseInput()
    }
    reader.readAsText(file, 'UTF-8')
  }

  /** Modifie la catégorie d'une ligne (édition inline depuis la review). */
  function setCategory(index: number, categoryId: string, type: TransactionType) {
    const tx = transactions.value[index]
    if (!tx) return
    tx.category      = categoryId
    tx.categoryLabel = resolveLabel(categoryId)
    tx.type          = type
    tx.needsReview   = false
  }

  function resolveLabel(categoryId: string): string {
    for (const cat of categoryStore.categories) {
      if (cat.id === categoryId) return cat.name
      const sub = cat.subcategories.find(s => s.id === categoryId)
      if (sub) return `${cat.name} > ${sub.name}`
    }
    return ''
  }

  function toRow(tx: AiParsedTransaction) {
    return {
      name:        tx.name,
      amount:      tx.amount,
      date:        tx.date,
      type:        tx.type,
      category:    tx.category,
      categorized: !!tx.category,
    }
  }

  /** Rejette une ligne (ne sera pas importée). */
  function dismiss(index: number) {
    dismissedIndexes.value = new Set([...dismissedIndexes.value, index])
    if (visible.value.length === 0) finishIfDone()
  }

  /** Valide et importe une seule transaction (validation 1 par 1). */
  async function acceptOne(index: number) {
    const tx = transactions.value[index]
    if (!tx || acceptingIndex.value !== null || acceptingAll.value) return
    acceptingIndex.value = index
    try {
      const row = toRow(tx)
      await transactionStore.bulkImport([row])
      importedCount.value++
      if (row.categorized) categorizedCount.value++
      acceptedIndexes.value = new Set([...acceptedIndexes.value, index])
    } catch (e) {
      errorMsg.value = e instanceof Error ? e.message : t('csvImport.error')
      phase.value    = 'error'
      return
    } finally {
      acceptingIndex.value = null
    }
    if (visible.value.length === 0) finishIfDone()
  }

  /** Importe toutes les lignes restantes en une fois (chemin « tout accepter »). */
  async function importAll() {
    if (acceptingAll.value || acceptingIndex.value !== null) return
    acceptingAll.value = true
    try {
      const rows = visible.value
      if (rows.length) {
        const payload = rows.map(toRow)
        const n = await transactionStore.bulkImport(payload)
        importedCount.value    += n
        categorizedCount.value += payload.filter(r => r.categorized).length
        acceptedIndexes.value   = new Set([...acceptedIndexes.value, ...rows.map(r => r.index)])
      }
    } catch (e) {
      errorMsg.value = e instanceof Error ? e.message : t('csvImport.error')
      phase.value    = 'error'
      return
    } finally {
      acceptingAll.value = false
    }
    phase.value = 'done'
  }

  function finishIfDone() {
    phase.value = 'done'
  }

  function reset() {
    phase.value            = 'prompt'
    rawInput.value         = ''
    errorMsg.value         = ''
    transactions.value     = []
    skipped.value          = 0
    dismissedIndexes.value = new Set()
    acceptedIndexes.value  = new Set()
    acceptingIndex.value   = null
    acceptingAll.value     = false
    importedCount.value    = 0
    categorizedCount.value = 0
    search.value           = ''
    sortField.value        = 'confidence'
    sortDir.value          = 'asc'
  }

  return {
    phase,
    rawInput,
    errorMsg,
    transactions,
    skipped,
    importedCount,
    categorizedCount,
    promptCopied,
    prompt,
    visible,
    displayed,
    search,
    sortField,
    sortDir,
    toggleSort,
    reviewCount,
    depenseCount,
    revenuCount,
    acceptingIndex,
    acceptingAll,
    copyPrompt,
    parseInput,
    onFileChange,
    setCategory,
    acceptOne,
    dismiss,
    importAll,
    reset,
  }
}
