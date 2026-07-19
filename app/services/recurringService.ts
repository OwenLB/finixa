import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecurringExpense, RecurringFrequency, AccountingOffset, TransactionType } from '~/types'

function mapRow(row: Record<string, unknown>): RecurringExpense {
  return {
    id:               row.id as string,
    name:             row.name as string,
    amount:           row.amount as number,
    type:             row.type as TransactionType,
    category:         row.category as string,
    categorized:      row.categorized as boolean,
    frequency:        row.frequency as RecurringFrequency,
    dayOfMonth:       row.day_of_month as number | null,
    startDate:        row.start_date as string,
    endDate:          row.end_date as string | null,
    accountingOffset: ((row.accounting_offset as string) ?? 'same_month') as AccountingOffset,
  }
}

export async function fetchRecurring(client: SupabaseClient): Promise<RecurringExpense[]> {
  const { data, error } = await client
    .from('recurring_transactions')
    .select('id, name, amount, type, category, categorized, frequency, day_of_month, start_date, end_date, accounting_offset')
    .order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function insertRecurring(
  client: SupabaseClient,
  userId: string,
  payload: Omit<RecurringExpense, 'id'>,
): Promise<RecurringExpense> {
  const { data, error } = await client
    .from('recurring_transactions')
    .insert({
      user_id:          userId,
      name:             payload.name,
      amount:           payload.amount,
      type:             payload.type,
      category:         payload.category,
      categorized:      payload.categorized,
      frequency:        payload.frequency,
      day_of_month:     payload.dayOfMonth,
      start_date:       payload.startDate,
      end_date:         payload.endDate,
      accounting_offset: payload.accountingOffset,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function updateRecurring(
  client: SupabaseClient,
  id: string,
  payload: Omit<RecurringExpense, 'id'>,
): Promise<RecurringExpense> {
  const { data, error } = await client
    .from('recurring_transactions')
    .update({
      name:              payload.name,
      amount:            payload.amount,
      type:              payload.type,
      category:          payload.category,
      categorized:       payload.categorized,
      frequency:         payload.frequency,
      day_of_month:      payload.dayOfMonth,
      start_date:        payload.startDate,
      end_date:          payload.endDate,
      accounting_offset: payload.accountingOffset,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function closeRecurring(client: SupabaseClient, id: string, endDate: string): Promise<void> {
  const { error } = await client.from('recurring_transactions').update({ end_date: endDate }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRecurring(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('recurring_transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Clé d'occurrence ─────────────────────────────────────────────────────────
// Identifiant stable par occurrence : utilisé pour la contrainte d'unicité en DB
// et pour la déduplication côté client.

export function getOccurrenceKey(dateIso: string, frequency: RecurringFrequency): string {
  const d = new Date(dateIso.length === 10 ? dateIso + 'T12:00:00' : dateIso)

  if (frequency === 'monthly') {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }

  if (frequency === 'weekly') {
    // Numéro de semaine ISO 8601 : semaine 1 = celle qui contient le premier jeudi
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const day  = date.getUTCDay() || 7   // dimanche → 7
    date.setUTCDate(date.getUTCDate() + 4 - day) // jeudi de la même semaine ISO
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
  }

  if (frequency === 'quarterly') {
    const y = d.getFullYear()
    const q = Math.floor(d.getMonth() / 3) + 1
    return `${y}-Q${q}`
  }

  // yearly
  return `${d.getFullYear()}`
}

// ─── Calcul des occurrences dans une plage de dates ───────────────────────────
// Aucune écriture en DB — appelé côté client au moment du fetch

export function getDatesInRange(rec: RecurringExpense, rangeStart: Date, rangeEnd: Date): string[] {
  const frequency = rec.frequency
  const startDate = new Date(rec.startDate + 'T12:00:00')
  const endDate   = rec.endDate ? new Date(rec.endDate + 'T23:59:59') : null
  const dates: string[] = []

  if (startDate >= rangeEnd)               return []
  if (endDate && endDate < rangeStart)     return []

  if (frequency === 'monthly') {
    // Itère sur chaque mois de la plage
    const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    while (cur < rangeEnd) {
      const year    = cur.getFullYear()
      const month   = cur.getMonth()
      const dom     = startDate.getDate()
      const lastDay = new Date(year, month + 1, 0).getDate()
      const d       = new Date(year, month, Math.min(dom, lastDay), 12, 0, 0)
      if (d >= rangeStart && d < rangeEnd && d >= startDate && (!endDate || d <= endDate)) {
        dates.push(toIso(d))
      }
      cur.setMonth(cur.getMonth() + 1)
    }
  } else if (frequency === 'weekly') {
    // Avance depuis startDate jusqu'à la première occurrence dans la plage
    let current = new Date(startDate)
    const diffMs = rangeStart.getTime() - current.getTime()
    if (diffMs > 0) {
      const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
      current = new Date(current.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)
    }
    while (current < rangeEnd) {
      if (current >= rangeStart && (!endDate || current <= endDate)) {
        dates.push(toIso(current))
      }
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  } else if (frequency === 'quarterly') {
    const dom = startDate.getDate()
    // Premier mois de trimestre >= rangeStart qui est aligné sur startDate
    const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    // Recule jusqu'au premier mois trimestriel à partir de startDate
    const monthDiff = (cur.getFullYear() - startDate.getFullYear()) * 12 + (cur.getMonth() - startDate.getMonth())
    const offset = ((monthDiff % 3) + 3) % 3
    cur.setMonth(cur.getMonth() - offset)
    while (cur < rangeEnd) {
      const year    = cur.getFullYear()
      const month   = cur.getMonth()
      const lastDay = new Date(year, month + 1, 0).getDate()
      const d       = new Date(year, month, Math.min(dom, lastDay), 12, 0, 0)
      if (d >= rangeStart && d < rangeEnd && d >= startDate && (!endDate || d <= endDate)) {
        dates.push(toIso(d))
      }
      cur.setMonth(cur.getMonth() + 3)
    }
  } else if (frequency === 'yearly') {
    const startYear = rangeStart.getFullYear()
    const endYear   = rangeEnd.getFullYear()
    for (let y = startYear; y <= endYear; y++) {
      const d = new Date(y, startDate.getMonth(), startDate.getDate(), 12, 0, 0)
      if (d >= rangeStart && d < rangeEnd && d >= startDate && (!endDate || d <= endDate)) {
        dates.push(toIso(d))
      }
    }
  }

  return dates
}

function toIso(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}T12:00:00`
}
