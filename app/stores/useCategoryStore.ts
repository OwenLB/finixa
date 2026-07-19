import { defineStore } from 'pinia'
import type { TransactionType, ManagedCategory, EnvelopeKey  } from '~/types'
import { getSessionUserId } from '~/utils/auth'
import { currentMonthKey } from '~/utils/period'
import {
  fetchCategories,
  fetchBudgetTotals,
  insertCategory,
  patchCategory,
  swapCategorySortOrder,
  removeCategory,
  removeCategories,
  insertSubcategory,
  updateSubcategory as updateSubcategoryService,
  updateSubcategoryEnvelope as updateSubcategoryEnvelopeService,
  updateSubcategoryExcluded as updateSubcategoryExcludedService,
  reorderCategories,
  reorderSubcategories,
  removeSubcategory,
  bulkCreateFromTemplate,
  type TemplateCategoryInput,
} from '~/services/categoryService'

export const TYPE_COLOR: Record<TransactionType, string> = {
  revenu:  '#34d399',
  depense: '#f97316',
  epargne: '#60a5fa',
}

export const useCategoryStore = defineStore('categories', () => {
  const supabase = useSupabaseClient()
  const user     = useSupabaseUser()
  const { show: showToast } = useToast()

  const categories   = ref<ManagedCategory[]>([])
  const budgetTotals = ref(new Map<string, number>())
  const loading      = ref(false)
  const error        = ref<string | null>(null)

  async function fetch() {
    if (!user.value) return
    loading.value = true
    error.value   = null
    try {
      const [cats, totals] = await Promise.all([
        fetchCategories(supabase),
        fetchBudgetTotals(supabase),
      ])
      categories.value   = cats
      budgetTotals.value = totals
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des catégories'
    } finally {
      loading.value = false
    }
  }

  async function refreshBudgets() {
    try {
      const [cats, totals] = await Promise.all([
        fetchCategories(supabase),
        fetchBudgetTotals(supabase),
      ])
      categories.value   = cats
      budgetTotals.value = totals
    } catch {
      // silencieux — refreshBudgets est appelé après des mutations, pas au chargement initial
    }
  }

  const allSubcategoryNames = computed(() =>
    new Set(categories.value.flatMap(c => c.subcategories.map(s => s.name)))
  )

  const allSubcategoryIds = computed(() =>
    new Set(categories.value.flatMap(c => c.subcategories.map(s => s.id)))
  )

  // O(1) lookup: subcategory id/name → display label, category id → category name
  const subcategoryLookup = computed(() => {
    const map = new Map<string, string>()
    for (const cat of categories.value) {
      map.set(cat.id, cat.name)
      for (const sub of cat.subcategories) {
        map.set(sub.id, sub.name)
        map.set(sub.name, sub.name)
      }
    }
    return map
  })

  const budgetByEnvelope = computed(() => {
    const map = new Map<string, number>()
    for (const cat of categories.value) {
      for (const sub of cat.subcategories) {
        if (!sub.envelope) continue
        map.set(sub.envelope, (map.get(sub.envelope) ?? 0) + (sub.budget ?? 0))
      }
    }
    return map
  })

  function byType(type: TransactionType) {
    return categories.value.filter(c => c.type === type)
  }

  async function addCategory(type: TransactionType, name: string, iconKey: string, color: string) {
    if (!name.trim()) return
    const userId    = await getSessionUserId(supabase)
    const sortOrder = categories.value.filter(c => c.type === type).length
    const cat = await insertCategory(supabase, userId, type, name, iconKey, color, sortOrder)
    if (cat) categories.value.push(cat)
  }

  async function updateCategory(id: string, name: string, iconKey: string, color: string, isVariable: boolean, excluded: boolean) {
    const cat = categories.value.find(c => c.id === id)
    if (!cat) return
    await patchCategory(supabase, id, name, iconKey, color, isVariable, excluded)
    cat.name       = name.trim()
    cat.iconKey    = iconKey
    cat.color      = color
    cat.isVariable = isVariable
    cat.excluded   = excluded
  }

  async function moveCategory(id: string, direction: 'up' | 'down') {
    const cat = categories.value.find(c => c.id === id)
    if (!cat) return
    const group = categories.value.filter(c => c.type === cat.type)
    const idx   = group.findIndex(c => c.id === id)
    const swap  = direction === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= group.length) return
    const gi = categories.value.indexOf(group[idx]!)
    const gj = categories.value.indexOf(group[swap]!)
    const tmp = categories.value[gi]!
    categories.value[gi] = categories.value[gj]!
    categories.value[gj] = tmp
    await swapCategorySortOrder(supabase, group[idx]!.id, swap, group[swap]!.id, idx)
  }

  async function addSubcategory(catId: string, name: string, budget: number | null = null, envelope: EnvelopeKey | null = null) {
    if (!name.trim()) return
    const userId = await getSessionUserId(supabase)
    const cat    = categories.value.find(c => c.id === catId)
    if (!cat) return
    const sub = await insertSubcategory(supabase, userId, catId, name, budget, cat.subcategories.length, currentMonthKey(), envelope)
    if (sub) {
      cat.subcategories.push(sub)
      await refreshBudgets()
    }
  }

  async function updateSubcategory(catId: string, subId: string, name: string, budget: number | null) {
    const cat = categories.value.find(c => c.id === catId)
    const sub = cat?.subcategories.find(s => s.id === subId)
    if (!cat || !sub) return
    const updated = await updateSubcategoryService(supabase, subId, name, budget, currentMonthKey())
    if (!updated) return
    const idx = cat.subcategories.findIndex(s => s.id === subId)
    if (idx !== -1) cat.subcategories[idx] = updated
    await refreshBudgets()
  }

  async function moveCategoryTo(id: string, from: number, to: number) {
    const cat = categories.value.find(c => c.id === id)
    if (!cat || from === to) return
    const group = categories.value.filter(c => c.type === cat.type)
    if (from < 0 || from >= group.length || to < 0 || to >= group.length) return
    const [item] = group.splice(from, 1)
    group.splice(to, 0, item!)
    // Rebuild the flat array preserving other types' order
    let gi = 0
    for (let i = 0; i < categories.value.length; i++) {
      if (categories.value[i]!.type === cat.type) {
        categories.value[i] = group[gi++]!
      }
    }
    await reorderCategories(supabase, group)
  }

  async function moveSubcategory(catId: string, from: number, to: number) {
    const cat = categories.value.find(c => c.id === catId)
    if (!cat || from === to) return
    const [item] = cat.subcategories.splice(from, 1)
    cat.subcategories.splice(to, 0, item!)
    await reorderSubcategories(supabase, cat.subcategories)
  }

  async function deleteCategory(id: string) {
    await removeCategory(supabase, id)
    const idx = categories.value.findIndex(c => c.id === id)
    if (idx !== -1) categories.value.splice(idx, 1)
    showToast('Catégorie supprimée', { type: 'success' })
  }

  /**
   * Crée en masse les catégories (déjà résolues et éventuellement éditées par
   * l'utilisateur à l'étape Profil). Retourne les catégories du store, IDs réels
   * inclus, pour que l'étape Récurrences puisse lier par ID.
   *
   * Idempotence : un refresh pendant l'onboarding réinitialise l'étape locale ;
   * sans cette garde, on recréerait tout en double. Si l'utilisateur a déjà des
   * catégories, on ne crée rien et on renvoie l'existant.
   */
  async function createFromTemplate(cats: TemplateCategoryInput[]): Promise<ManagedCategory[]> {
    await fetch()
    if (categories.value.length > 0) return categories.value

    if (cats.length > 0) {
      const userId   = await getSessionUserId(supabase)
      const monthKey = currentMonthKey()
      await bulkCreateFromTemplate(supabase, userId, cats, monthKey)
      await fetch()
    }

    return categories.value
  }

  /** Supprime toutes les catégories de l'utilisateur (changement de profil en onboarding). */
  async function clearAll() {
    const ids = categories.value.map(c => c.id)
    if (!ids.length) return
    await removeCategories(supabase, ids)
    categories.value   = []
    budgetTotals.value = new Map()
  }

  async function setSubcategoryEnvelope(catId: string, subId: string, envelope: EnvelopeKey | null) {
    const cat = categories.value.find(c => c.id === catId)
    const sub = cat?.subcategories.find(s => s.id === subId)
    if (!sub) return
    await updateSubcategoryEnvelopeService(supabase, subId, envelope)
    sub.envelope = envelope
  }

  async function setSubcategoryExcluded(catId: string, subId: string, excluded: boolean) {
    const cat = categories.value.find(c => c.id === catId)
    const sub = cat?.subcategories.find(s => s.id === subId)
    if (!sub) return
    await updateSubcategoryExcludedService(supabase, subId, excluded)
    sub.excluded = excluded
  }

  async function deleteSubcategory(catId: string, subId: string) {
    await removeSubcategory(supabase, subId)
    const cat = categories.value.find(c => c.id === catId)
    if (!cat) return
    const idx = cat.subcategories.findIndex(s => s.id === subId)
    if (idx !== -1) cat.subcategories.splice(idx, 1)
    await refreshBudgets()
    showToast('Sous-catégorie supprimée', { type: 'success' })
  }

  return {
    categories, budgetTotals, budgetByEnvelope, subcategoryLookup, loading, error, fetch, byType, allSubcategoryNames, allSubcategoryIds,
    addCategory, updateCategory, moveCategory, moveCategoryTo,
    addSubcategory, updateSubcategory, moveSubcategory, setSubcategoryEnvelope, setSubcategoryExcluded,
    deleteCategory, deleteSubcategory, createFromTemplate, clearAll,
  }
})
