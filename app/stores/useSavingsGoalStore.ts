import { defineStore } from 'pinia'
import type { SavingsGoal } from '~/types'
import { currentMonthKey } from '~/utils/period'
import {
  fetchSavingsGoals,
  createSavingsGoalAtomic,
  patchSavingsGoal,
  removeSavingsGoal,
} from '~/services/savingsGoalService'
import { patchCategory } from '~/services/categoryService'
import { useCategoryStore } from '~/stores/useCategoryStore'

export const useSavingsGoalStore = defineStore('savingsGoals', () => {
  const supabase      = useSupabaseClient()
  const user          = useSupabaseUser()
  const categoryStore = useCategoryStore()

  const goals   = ref<SavingsGoal[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function fetch() {
    if (!user.value) return
    loading.value = true
    error.value   = null
    try {
      goals.value = await fetchSavingsGoals(supabase)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des cagnottes'
    } finally {
      loading.value = false
    }
  }

  /** Crée la cagnotte + la catégorie épargne liée + la sous-catégorie (atomique) */
  async function create(name: string, targetAmount: number, startAmount: number, color: string) {
    try {
      const goal = await createSavingsGoalAtomic(
        supabase, name, targetAmount, startAmount, color,
        currentMonthKey(), categoryStore.byType('epargne').length,
      )
      goals.value.push(goal)
      await categoryStore.fetch()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création de la cagnotte'
      throw e
    }
  }

  /** Met à jour nom, montant cible, couleur — et synchronise la catégorie/sous-catégorie liée */
  async function update(id: string, name: string, targetAmount: number, color: string) {
    const goal = goals.value.find(g => g.id === id)
    if (!goal) return

    try {
      await patchSavingsGoal(supabase, id, name, targetAmount, color)

      // Sync catégorie liée (retrouvée via subcategoryId)
      if (goal.subcategoryId) {
        const cat = categoryStore.categories.find(c =>
          c.subcategories.some(s => s.id === goal.subcategoryId)
        )
        if (cat) {
          await patchCategory(supabase, cat.id, name, 'piggy-bank', color, cat.isVariable, cat.excluded)
          await categoryStore.fetch()
        }
      }

      goal.name         = name
      goal.targetAmount = targetAmount
      goal.color        = color
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la mise à jour de la cagnotte'
      throw e
    }
  }

  /** Supprime la cagnotte (la catégorie liée reste, l'utilisateur peut la supprimer manuellement) */
  async function remove(id: string) {
    try {
      await removeSavingsGoal(supabase, id)
      const idx = goals.value.findIndex(g => g.id === id)
      if (idx !== -1) goals.value.splice(idx, 1)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression de la cagnotte'
      throw e
    }
  }

  return { goals, loading, error, fetch, create, update, remove }
})
