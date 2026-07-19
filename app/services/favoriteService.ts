import type { SupabaseClient } from '@supabase/supabase-js'
import type { Favorite, TransactionType } from '~/types'

function mapRow(row: Record<string, unknown>): Favorite {
  return {
    id:          row.id as string,
    name:        row.name as string,
    amount:      Number(row.amount),
    type:        row.type as TransactionType,
    category:    row.category as string,
    subcategory: row.subcategory as string,
    position:    Number(row.position),
  }
}

export async function fetchFavorites(client: SupabaseClient): Promise<Favorite[]> {
  const { data, error } = await client.from('favorites').select('*').order('position')
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function insertFavorite(
  client: SupabaseClient,
  userId: string,
  fav: Omit<Favorite, 'id'>,
): Promise<Favorite> {
  const { data, error } = await client
    .from('favorites')
    .insert({ ...fav, user_id: userId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function deleteFavorite(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('favorites').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateFavorite(
  client: SupabaseClient,
  id: string,
  data: { name: string; amount: number; type: TransactionType; category: string; subcategory: string },
): Promise<void> {
  const { error } = await client.from('favorites').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateFavoritePositions(
  client: SupabaseClient,
  updates: { id: string; position: number }[],
): Promise<void> {
  const results = await Promise.all(
    updates.map(({ id, position }) =>
      client.from('favorites').update({ position }).eq('id', id),
    ),
  )
  const error = results.find(r => r.error)?.error
  if (error) throw new Error(error.message)
}
