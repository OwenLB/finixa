import type { SupabaseClient } from '@supabase/supabase-js'
import type { Transaction, TransactionType, TransactionForm  } from '~/types'
import { todayLocalISO } from '~/utils/localDate'

// Sélection explicite (vs select('*')) sur la table la plus volumineuse —
// exactement les colonnes lues par mapTransactionRow.
const TX_COLUMNS = 'id, name, note, category, categorized, amount, date, accounting_date, type, recurring_id, recurrence_occurrence, status, hors_budget'

function buildPayload(form: TransactionForm, existing?: Partial<Transaction>, recurringId?: string | null) {
  const signedAmount = form.type === 'revenu'
    ? Math.abs(form.amount)
    : -Math.abs(form.amount)

  return {
    name:             form.label || form.category || 'Transaction',
    note:             form.note || null,
    category:         form.subcategoryId || form.categoryId || 'Autre',
    categorized:      !!form.subcategoryId,
    amount:           signedAmount,
    date:             form.date + 'T' + (existing?.date?.slice(11) ?? new Date().toTimeString().slice(0, 8)),
    accounting_date:  form.accountingDate || null,
    type:             form.type,
    status:           existing?.status ?? 'pending',
    hors_budget:      form.horsBudget ?? false,
    // If recurringId is explicitly provided (even null), use it; otherwise preserve existing
    recurring_id:     recurringId !== undefined ? recurringId : (existing?.recurringId ?? null),
  }
}

export function mapTransactionRow(row: Record<string, unknown>): Transaction {
  return {
    id:                   row.id as string,
    name:                 row.name as string,
    note:                 (row.note as string | null) ?? null,
    category:             row.category as string,
    categorized:          row.categorized as boolean,
    amount:               row.amount as number,
    date:                 row.date as string,
    accountingDate:       (row.accounting_date as string | null) ?? null,
    type:                 row.type as TransactionType,
    recurringId:          row.recurring_id as string | null | undefined,
    recurrenceOccurrence: (row.recurrence_occurrence as string | null) ?? null,
    status:               row.status as 'checked' | 'pending',
    horsBudget:           (row.hors_budget as boolean) ?? false,
  }
}

export async function fetchTransactions(
  client: SupabaseClient,
  range: { start: string; end: string },
): Promise<Transaction[]> {
  const { data, error } = await client
    .from('transactions')
    .select(TX_COLUMNS)
    .or(`and(accounting_date.is.null,date.gte.${range.start},date.lt.${range.end}),and(accounting_date.not.is.null,accounting_date.gte.${range.start},accounting_date.lt.${range.end})`)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapTransactionRow)
}

export async function fetchUncategorizedTransactions(
  client: SupabaseClient,
): Promise<Transaction[]> {
  const { data, error } = await client
    .from('transactions')
    .select(TX_COLUMNS)
    .eq('categorized', false)
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapTransactionRow)
}

export async function countUncategorizedTransactions(client: SupabaseClient): Promise<number> {
  const { count, error } = await client
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('categorized', false)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function insertTransaction(
  client: SupabaseClient,
  userId: string,
  form: TransactionForm,
  recurringId?: string | null,
): Promise<Transaction> {
  const { data, error } = await client
    .from('transactions')
    .insert({ ...buildPayload(form, undefined, recurringId), user_id: userId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapTransactionRow(data)
}

export async function updateTransaction(
  client: SupabaseClient,
  id: string,
  form: TransactionForm,
  existing: Partial<Transaction>,
  recurringId?: string | null,
): Promise<Transaction | null> {
  const { data, error } = await client
    .from('transactions')
    .update(buildPayload(form, existing, recurringId))
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data ? mapTransactionRow(data) : null
}

export async function deleteTransaction(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from('transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function insertMaterializedTransaction(
  client: SupabaseClient,
  userId: string,
  tx: Transaction,
  status: 'checked' | 'pending',
): Promise<Transaction> {
  const { data, error } = await client
    .from('transactions')
    .insert({
      user_id:               userId,
      name:                  tx.name,
      category:              tx.category,
      categorized:           tx.categorized,
      amount:                tx.amount,
      date:                  tx.date,
      accounting_date:       tx.accountingDate ?? null,
      type:                  tx.type,
      status,
      recurring_id:          tx.recurringId ?? null,
      recurrence_occurrence: tx.recurrenceOccurrence ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapTransactionRow(data)
}

export async function bulkDeleteTransactions(
  client: SupabaseClient,
  ids: string[],
): Promise<void> {
  if (!ids.length) return
  const { error } = await client.from('transactions').delete().in('id', ids)
  if (error) throw new Error(error.message)
}

export async function bulkSetStatus(
  client: SupabaseClient,
  ids: string[],
  status: 'checked' | 'pending',
): Promise<void> {
  if (!ids.length) return
  if (status === 'checked') {
    // accounting_date = date::date (date de base de chaque transaction) — via RPC
    const { error } = await client.rpc('bulk_check_transactions', { p_ids: ids })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await client.from('transactions').update({ status, accounting_date: null }).in('id', ids)
    if (error) throw new Error(error.message)
  }
}

export async function bulkSetCategory(
  client: SupabaseClient,
  ids: string[],
  category: string,
  categorized: boolean,
  type: TransactionType,
): Promise<void> {
  if (!ids.length) return
  const { error } = await client
    .from('transactions')
    .update({ category, categorized, type })
    .in('id', ids)
  if (error) throw new Error(error.message)
}

export async function bulkInsertTransactions(
  client: SupabaseClient,
  userId: string,
  rows: Array<{ name: string; amount: number; date: string; type: TransactionType; category?: string; categorized?: boolean }>,
): Promise<Transaction[]> {
  if (!rows.length) return []
  const payload = rows.map(r => ({
    user_id:     userId,
    name:        r.name,
    amount:      r.amount,
    date:        r.date,
    type:        r.type,
    category:    r.category ?? '',
    categorized: r.categorized ?? false,
    status:      'pending' as const,
  }))
  const { data, error } = await client.from('transactions').insert(payload).select()
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapTransactionRow)
}

/**
 * Re-lie un ensemble de transactions vers une nouvelle définition récurrente
 * et met à jour leurs champs en une seule requête bulk.
 * Utilisé par updateRecurringDefinition après modification d'une règle récurrente.
 */
export async function bulkRelinkToRecurring(
  client: SupabaseClient,
  ids: string[],
  newRecurringId: string,
  name: string,
  signedAmount: number,
  type: TransactionType,
  category: string,
  categorized: boolean,
): Promise<void> {
  if (!ids.length) return
  const { error } = await client
    .from('transactions')
    .update({ recurring_id: newRecurringId, name, amount: signedAmount, type, category, categorized })
    .in('id', ids)
  if (error) throw new Error(error.message)
}

export async function toggleTransactionStatus(
  client: SupabaseClient,
  id: string,
  currentStatus: 'checked' | 'pending',
): Promise<{ status: 'checked' | 'pending'; accountingDate: string | null }> {
  const newStatus     = currentStatus === 'checked' ? 'pending' : 'checked'
  const accountingDate = newStatus === 'checked' ? todayLocalISO() : null
  const { error } = await client
    .from('transactions')
    .update({ status: newStatus, accounting_date: accountingDate })
    .eq('id', id)
  if (error) throw new Error(error.message)
  return { status: newStatus, accountingDate }
}
