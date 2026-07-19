import { defineStore } from 'pinia'
import type { RecurringExpense, TransactionForm } from '~/types'
import { getSessionUserId } from '~/utils/auth'
import { toLocalISO } from '~/utils/localDate'
import {
  fetchRecurring,
  insertRecurring,
  closeRecurring,
  deleteRecurring,
} from '~/services/recurringService'

function toSignedAmount(amount: number, type: string): number {
  return type === 'revenu' ? Math.abs(amount) : -Math.abs(amount)
}

export const useRecurringStore = defineStore('recurring', () => {
  const supabase = useSupabaseClient()
  const user     = useSupabaseUser()

  const recurringExpenses = ref<RecurringExpense[]>([])
  const loading           = ref(false)
  const error             = ref<string | null>(null)

  async function fetch() {
    if (!user.value) return
    loading.value = true
    error.value   = null
    try {
      recurringExpenses.value = await fetchRecurring(supabase)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des récurrences'
    } finally {
      loading.value = false
    }
  }

  async function add(form: TransactionForm): Promise<RecurringExpense> {
    try {
      const userId = await getSessionUserId(supabase)
      const rec = await insertRecurring(supabase, userId, {
        name:             form.label || form.category || 'Récurrent',
        amount:           toSignedAmount(form.amount, form.type),
        type:             form.type,
        category:         form.subcategoryId || form.categoryId || '',
        categorized:      !!form.category,
        frequency:        form.frequency || 'monthly',
        dayOfMonth:       parseInt(form.date.slice(8, 10)) || null,
        startDate:        form.date,
        endDate:          form.recurringEndDate || null,
        accountingOffset: form.accountingOffset ?? 'same_month',
      })
      recurringExpenses.value.push(rec)
      return rec
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'ajout de la récurrence'
      throw e
    }
  }

  // Ferme l'ancienne définition la veille de la nouvelle date de début
  // et crée une nouvelle définition avec les valeurs du formulaire.
  async function update(id: string, form: TransactionForm): Promise<RecurringExpense> {
    try {
      const userId = await getSessionUserId(supabase)

      const startDate    = form.date
      const startDateObj = new Date(startDate + 'T12:00:00')
      const endDate = toLocalISO(new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 0))

      const payload: Omit<typeof recurringExpenses.value[0], 'id'> = {
        name:             form.label || form.category || 'Récurrent',
        amount:           toSignedAmount(form.amount, form.type),
        type:             form.type,
        category:         form.subcategoryId || form.categoryId || '',
        categorized:      !!form.category,
        frequency:        form.frequency || 'monthly',
        dayOfMonth:       parseInt(startDate.slice(8, 10)) || null,
        startDate,
        endDate:          form.recurringEndDate || null,
        accountingOffset: form.accountingOffset ?? 'same_month',
      }

      // 1. Ferme ou supprime l'ancienne définition
      // Si endDate < startDate de l'ancienne, on supprime (contrainte DB end_date >= start_date)
      const existing = recurringExpenses.value.find(r => r.id === id)
      if (existing && endDate >= existing.startDate) {
        await closeRecurring(supabase, id, endDate)
      } else {
        await deleteRecurring(supabase, id)
      }

      // 2. Créer la nouvelle définition
      const newRec = await insertRecurring(supabase, userId, payload)

      // 3. Remplacer dans le store
      const idx = recurringExpenses.value.findIndex(r => r.id === id)
      if (idx !== -1) recurringExpenses.value[idx] = newRec

      return newRec
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la mise à jour de la récurrence'
      throw e
    }
  }

  async function remove(id: string) {
    try {
      await deleteRecurring(supabase, id)
      recurringExpenses.value = recurringExpenses.value.filter(r => r.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression'
      throw e
    }
  }

  // Met à jour end_date sans créer de nouvelle définition
  async function close(id: string, endDate: string) {
    try {
      await closeRecurring(supabase, id, endDate)
      const rec = recurringExpenses.value.find(r => r.id === id)
      if (rec) rec.endDate = endDate
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la clôture de la récurrence'
      throw e
    }
  }

  // Insère une définition brute (utilisé pour dupliquer une récurrence)
  async function insertRaw(payload: Omit<RecurringExpense, 'id'>): Promise<RecurringExpense> {
    try {
      const userId = await getSessionUserId(supabase)
      const rec = await insertRecurring(supabase, userId, payload)
      recurringExpenses.value.push(rec)
      return rec
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'insertion'
      throw e
    }
  }

  return { recurringExpenses, loading, error, fetch, add, update, remove, close, insertRaw }
})
