import type { SupabaseClient } from '@supabase/supabase-js'
import type { SavingsGoal } from '~/types'

export async function fetchSavingsGoals(client: SupabaseClient): Promise<SavingsGoal[]> {
  const [goalsRes, progressRes] = await Promise.all([
    client.from('savings_goals').select('*').order('created_at'),
    client.rpc('get_savings_goals_progress'),
  ])
  const resError = goalsRes.error ?? progressRes.error
  if (resError) throw new Error(resError.message)
  if (!goalsRes.data) return []

  const progressMap = new Map<string, number>(
    ((progressRes.data ?? []) as { goal_id: string; total_saved: number }[])
      .map(r => [r.goal_id, Number(r.total_saved)])
  )

  return goalsRes.data.map(g => ({
    id:            g.id,
    name:          g.name,
    targetAmount:  Number(g.target_amount),
    startAmount:   Number(g.start_amount),
    currentAmount: progressMap.get(g.id) ?? Number(g.start_amount),
    subcategoryId: g.subcategory_id ?? null,
    color:         g.color,
    createdAt:     g.created_at,
  }))
}

/**
 * Crée atomiquement (RPC transactionnelle) la catégorie épargne, sa
 * sous-catégorie et l'objectif Un échec laisse la base
 * intacte (rollback), au lieu de catégories/sous-catégories orphelines.
 */
export async function createSavingsGoalAtomic(
  client:       SupabaseClient,
  name:         string,
  targetAmount: number,
  startAmount:  number,
  color:        string,
  monthKey:     string,
  sortOrder:    number,
): Promise<SavingsGoal> {
  const { data, error } = await client.rpc('create_savings_goal', {
    p_name:   name.trim(),
    p_target: targetAmount,
    p_start:  startAmount,
    p_color:  color,
    p_month:  monthKey,
    p_sort:   sortOrder,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Création de la cagnotte échouée')
  return {
    id:            data.id,
    name:          data.name,
    targetAmount:  Number(data.target_amount),
    startAmount:   Number(data.start_amount),
    currentAmount: Number(data.start_amount),
    subcategoryId: data.subcategory_id ?? null,
    color:         data.color,
    createdAt:     data.created_at,
  }
}

export async function patchSavingsGoal(
  client:       SupabaseClient,
  id:           string,
  name:         string,
  targetAmount: number,
  color:        string,
): Promise<void> {
  const { error } = await client
    .from('savings_goals')
    .update({ name: name.trim(), target_amount: targetAmount, color })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function removeSavingsGoal(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('savings_goals').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export interface GoalHistoryPoint { date: string; cumulative: number }

export async function fetchSavingsGoalHistory(
  client: SupabaseClient,
  goalId: string,
): Promise<GoalHistoryPoint[]> {
  const { data, error } = await client.rpc('get_savings_goal_history', { p_goal_id: goalId })
  if (error) throw new Error(error.message)
  return ((data ?? []) as { tx_date: string; cumulative: number }[])
    .map(r => ({ date: r.tx_date, cumulative: Number(r.cumulative) }))
}
