import { ref, watch, computed, type Ref } from 'vue'
import { parseBankCsv } from '~/utils/csvParser'
import type { ParseResult, ParsedTransaction } from '~/utils/csvParser'
import { detectRecurringPatterns, nextOccurrenceDate, filterNewSuggestions } from '~/utils/detectRecurring'
import type { RecurringSuggestion } from '~/utils/detectRecurring'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useRecurringStore } from '~/stores/useRecurringStore'
import { _csvAutoRecurring } from '~/composables/csvRecurringState'
import type { TransactionType } from '~/types'

type Phase = 'idle' | 'preview' | 'importing' | 'done' | 'recurring' | 'error'

// ─── Persistence localStorage ─────────────────────────────────────────────────
const STORAGE_KEY = 'finixa:rec_suggestions'
const MAX_AGE_MS  = 30 * 24 * 60 * 60 * 1000

interface StoredState {
  suggestions: RecurringSuggestion[]
  dismissed:   number[]
  accepted:    number[]
  savedAt:     number
}

function loadFromStorage(): { suggestions: RecurringSuggestion[]; dismissed: Set<number>; accepted: Set<number> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { suggestions: [], dismissed: new Set(), accepted: new Set() }
    const stored: StoredState = JSON.parse(raw)
    if (Date.now() - stored.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return { suggestions: [], dismissed: new Set(), accepted: new Set() }
    }
    return {
      suggestions: stored.suggestions,
      dismissed:   new Set(stored.dismissed),
      accepted:    new Set(stored.accepted),
    }
  } catch {
    return { suggestions: [], dismissed: new Set(), accepted: new Set() }
  }
}

function saveToStorage(suggestions: RecurringSuggestion[], dismissed: Set<number>, accepted: Set<number>) {
  try {
    const payload: StoredState = {
      suggestions,
      dismissed: [...dismissed],
      accepted:  [...accepted],
      savedAt:   Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* quota exceeded — ignore */ }
}

// ─── Module-level state (survive drawer close/open + refresh via localStorage) ─
const _init             = loadFromStorage()
const _suggestions      = ref<RecurringSuggestion[]>(_init.suggestions)
const _dismissedIndexes = ref<Set<number>>(_init.dismissed)
const _acceptedIndexes  = ref<Set<number>>(_init.accepted)

// Auto-persist whenever state changes
watch(
  [_suggestions, _dismissedIndexes, _acceptedIndexes],
  ([s, d, a]) => saveToStorage(s, d, a),
  { deep: true },
)

export function useCsvImport(open: Ref<boolean>) {
  const transactionStore = useTransactionStore()
  const recurringStore   = useRecurringStore()
  const supabase         = useSupabaseClient()
  const router = useRouter()
  const { t }  = useI18n()

  const phase         = ref<Phase>('idle')
  const filename      = ref('')
  const parsed        = ref<ParseResult>({ transactions: [], skipped: 0 })
  const importedCount = ref(0)
  const errorMsg      = ref('')
  const progressPct   = ref(0)
  const fileInput     = ref<HTMLInputElement | null>(null)
  const detectingHistory = ref(false)

  const suggestions      = _suggestions
  const dismissedIndexes = _dismissedIndexes
  const acceptedIndexes  = _acceptedIndexes
  const acceptingIndex   = ref<number | null>(null)
  const acceptingAll     = ref(false)

  let progressTimer: ReturnType<typeof setInterval> | null = null

  const depenseCount = computed(() => parsed.value.transactions.filter(tx => tx.type === 'depense').length)
  const revenuCount  = computed(() => parsed.value.transactions.filter(tx => tx.type === 'revenu').length)

  const visibleSuggestions = computed(() =>
    suggestions.value.map((s, i) => ({ ...s, index: i }))
      .filter(s => !dismissedIndexes.value.has(s.index) && !acceptedIndexes.value.has(s.index)),
  )

  const hasPendingSuggestions = computed(() => visibleSuggestions.value.length > 0)
  const pendingCount          = computed(() => visibleSuggestions.value.length)

  // { immediate: true } : nécessaire car le drawer peut s'ouvrir AVANT que ce watch soit créé
  watch(open, async (v) => {
    if (v && _csvAutoRecurring.value) {
      _csvAutoRecurring.value = false
      // Bascule immédiatement en phase recurring : sinon l'écran reste en 'idle'
      // (sélecteur d'import IA/CSV) pendant la détection async, ce qui le fait
      // apparaître à tort le temps de la requête.
      phase.value = 'recurring'
      if (suggestions.value.length) {
        await enrichWithCategories(suggestions.value)
      } else {
        // Ouverture depuis RecurringSection sans import CSV préalable → détecter l'historique.
        // Flag de chargement dès maintenant pour couvrir aussi le fetch (sinon
        // l'état vide « Toutes traitées » clignote avant la détection).
        detectingHistory.value = true
        await recurringStore.fetch()
        await detectFromHistory()
      }
    } else if (!v) {
      resetImportState()
    }
  }, { immediate: true })

  // ─── Fichier ────────────────────────────────────────────────────────────────

  function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    if (file.size > 10_000_000) {
      errorMsg.value = t('csvImport.fileTooLarge')
      phase.value    = 'error'
      return
    }

    filename.value = file.name
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const result  = parseBankCsv(content)

      if (!result.transactions.length) {
        errorMsg.value = t('csvImport.emptyFile')
        phase.value    = 'error'
        return
      }

      parsed.value = result
      phase.value  = 'preview'
    }
    reader.readAsText(file, 'UTF-8')
  }

  // ─── Déduplication des suggestions ───────────────────────────────────────────

  /**
   * Écarte les suggestions déjà configurées comme récurrences (même type + nom).
   * Nécessite que recurringStore soit chargé au préalable.
   */
  function filterAlreadyExisting(detected: RecurringSuggestion[]): RecurringSuggestion[] {
    return filterNewSuggestions(detected, recurringStore.recurringExpenses)
  }

  // ─── Import CSV ──────────────────────────────────────────────────────────────

  async function startImport() {
    phase.value       = 'importing'
    progressPct.value = 0
    clearSuggestions()
    startProgressAnimation()

    try {
      importedCount.value = await transactionStore.bulkImport(parsed.value.transactions)

      // Charge les récurrences existantes pour ne pas reproposer un doublon
      await recurringStore.fetch()
      const detected = filterAlreadyExisting(detectRecurringPatterns(parsed.value.transactions))
      await enrichWithCategories(detected)
      suggestions.value      = detected
      dismissedIndexes.value = new Set()
      acceptedIndexes.value  = new Set()

      finishProgress()
      setTimeout(() => { phase.value = 'done' }, 400)
    } catch (e) {
      stopProgress()
      errorMsg.value = e instanceof Error ? e.message : ''
      phase.value    = 'error'
    }
  }

  // ─── Détection depuis l'historique des transactions ──────────────────────────

  async function detectFromHistory() {
    detectingHistory.value = true
    try {
      // Récupère les 12 derniers mois depuis Supabase
      const start = new Date()
      start.setMonth(start.getMonth() - 12)
      const startStr = start.toISOString().slice(0, 10)

      const { data } = await supabase
        .from('transactions')
        .select('name, amount, date, type')
        .gte('date', startStr)
        .in('type', ['depense', 'revenu'])
        .is('recurring_id', null)
        .order('date', { ascending: false })

      if (!data?.length) return

      const parsed: ParsedTransaction[] = (data as { name: string; amount: number; date: string; type: string }[])
        .map(row => ({
          name:   row.name,
          amount: row.amount,
          date:   row.date,
          type:   row.type as 'depense' | 'revenu',
        }))

      const detected = detectRecurringPatterns(parsed)
      if (!detected.length) return

      // Filtre les patterns déjà configurés comme récurrents
      const filtered = filterAlreadyExisting(detected)
      if (!filtered.length) return

      await enrichWithCategories(filtered)
      suggestions.value      = filtered
      dismissedIndexes.value = new Set()
      acceptedIndexes.value  = new Set()
    } finally {
      detectingHistory.value = false
    }
  }

  /**
   * Appelle le RPC get_category_suggestions_bulk sur les libellés détectés
   * et injecte categoryId + categorized dans chaque suggestion.
   */
  async function enrichWithCategories(detected: RecurringSuggestion[]) {
    if (!detected.length) return

    const names = [...new Set(
      detected.flatMap(s => [s.displayName, ...s.originalNames]).filter(n => n.trim().length >= 2),
    )]

    const { data } = await supabase.rpc('get_category_suggestions_bulk', { p_names: names })
    if (!data) return

    const byName = new Map<string, { subcategory_id: string; type: TransactionType }>(
      (data as { input_name: string; subcategory_id: string; type: string }[]).map(row => [
        row.input_name,
        { subcategory_id: row.subcategory_id, type: row.type as TransactionType },
      ]),
    )

    for (const s of detected) {
      const candidates = [s.displayName, ...s.originalNames]
      for (const name of candidates) {
        const match = byName.get(name)
        if (match) {
          s.categoryId  = match.subcategory_id
          s.categorized = true
          s.type        = match.type === 'epargne' ? s.type : (match.type as 'depense' | 'revenu')
          break
        }
      }
    }
  }

  function startProgressAnimation() {
    progressTimer = setInterval(() => {
      const remaining = 90 - progressPct.value
      progressPct.value = Math.min(90, progressPct.value + Math.max(0.2, remaining * 0.04))
    }, 50)
  }

  function finishProgress() {
    stopProgress()
    progressPct.value = 100
  }

  function stopProgress() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
  }

  // ─── Suggestions récurrentes ─────────────────────────────────────────────────

  function clearSuggestions() {
    suggestions.value      = []
    dismissedIndexes.value = new Set()
    acceptedIndexes.value  = new Set()
  }

  function dismissSuggestion(index: number) {
    dismissedIndexes.value = new Set([...dismissedIndexes.value, index])
  }

  /** Modifie une suggestion avant validation (renommage, montant, catégorie…). */
  function updateSuggestion(index: number, patch: Partial<RecurringSuggestion>) {
    if (!suggestions.value[index]) return
    suggestions.value = suggestions.value.map((s, i) => i === index ? { ...s, ...patch } : s)
  }

  async function acceptSuggestion(index: number) {
    const suggestion = suggestions.value[index]
    if (!suggestion) return

    acceptingIndex.value = index
    try {
      const startDate = nextOccurrenceDate(suggestion.lastDate, suggestion.frequency, suggestion.dayOfMonth)
      await recurringStore.insertRaw({
        name:             suggestion.displayName,
        amount:           suggestion.amount,
        type:             suggestion.type,
        category:         suggestion.categoryId ?? '',
        categorized:      suggestion.categorized,
        frequency:        suggestion.frequency,
        dayOfMonth:       suggestion.dayOfMonth,
        startDate,
        endDate:          null,
        accountingOffset: 'same_month',
      })
      acceptedIndexes.value = new Set([...acceptedIndexes.value, index])
    } catch {
      // silently ignore — user can retry via the recurring screen
    } finally {
      acceptingIndex.value = null
    }
  }

  async function acceptAll() {
    acceptingAll.value = true
    const indexes = [...visibleSuggestions.value.map(s => s.index)]
    for (const idx of indexes) {
      await acceptSuggestion(idx)
    }
    acceptingAll.value = false
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async function goToRecurring() {
    // Si aucune suggestion en attente, tente de détecter depuis l'historique
    if (!suggestions.value.length) {
      await recurringStore.fetch()
      await detectFromHistory()
    }
    phase.value = 'recurring'
  }

  function goToCategorize() {
    open.value = false
    router.push('/transactions?queue=open')
  }

  function closeDrawer() {
    open.value = false
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────

  function resetImportState() {
    stopProgress()
    phase.value         = 'idle'
    filename.value      = ''
    parsed.value        = { transactions: [], skipped: 0 }
    importedCount.value = 0
    errorMsg.value      = ''
    progressPct.value   = 0
    if (fileInput.value) fileInput.value.value = ''
  }

  function reset() {
    resetImportState()
    clearSuggestions()
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    phase,
    filename,
    parsed,
    importedCount,
    errorMsg,
    progressPct,
    fileInput,
    depenseCount,
    revenuCount,
    suggestions,
    visibleSuggestions,
    acceptingIndex,
    acceptingAll,
    acceptedIndexes,
    detectingHistory,
    hasPendingSuggestions,
    pendingCount,
    onFileChange,
    startImport,
    dismissSuggestion,
    updateSuggestion,
    acceptSuggestion,
    acceptAll,
    goToRecurring,
    goToCategorize,
    closeDrawer,
    reset,
  }
}
