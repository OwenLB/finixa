import { defineStore } from 'pinia'
import type { Favorite, TransactionType } from '~/types'
import { getSessionUserId } from '~/utils/auth'
import {
  fetchFavorites,
  insertFavorite,
  deleteFavorite,
  updateFavorite,
  updateFavoritePositions,
} from '~/services/favoriteService'

export const useFavoriteStore = defineStore('favorites', () => {
  const supabase  = useSupabaseClient()
  const user      = useSupabaseUser()
  const favorites = ref<Favorite[]>([])
  const loading   = ref(false)
  const loaded    = ref(false)
  const error     = ref<string | null>(null)

  async function fetch() {
    if (!user.value) return
    loading.value = true
    error.value   = null
    try {
      favorites.value = await fetchFavorites(supabase)
      loaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des favoris'
    } finally {
      loading.value = false
    }
  }

  async function add(fav: { name: string; amount: number; type: TransactionType; category: string; subcategory: string }): Promise<Favorite> {
    try {
      const userId   = await getSessionUserId(supabase)
      const position = favorites.value.length
      const inserted = await insertFavorite(supabase, userId, { ...fav, position })
      favorites.value.push(inserted)
      return inserted
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'ajout du favori'
      throw e
    }
  }

  async function update(id: string, data: { name: string; amount: number; type: TransactionType; category: string; subcategory: string }) {
    try {
      await updateFavorite(supabase, id, data)
      favorites.value = favorites.value.map(f => f.id === id ? { ...f, ...data } : f)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la mise à jour du favori'
      throw e
    }
  }

  async function remove(id: string) {
    try {
      await deleteFavorite(supabase, id)
      favorites.value = favorites.value.filter(f => f.id !== id)
      await reindex()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression du favori'
      throw e
    }
  }

  async function reorder(fromIndex: number, toIndex: number) {
    const arr = [...favorites.value]
    const [item] = arr.splice(fromIndex, 1)
    arr.splice(toIndex, 0, item)
    favorites.value = arr
    try {
      await reindex()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du réordonnancement'
    }
  }

  async function reindex() {
    favorites.value.forEach((f, i) => { f.position = i })
    await updateFavoritePositions(
      supabase,
      favorites.value.map((f, i) => ({ id: f.id, position: i })),
    )
  }

  return { favorites, loading, loaded, error, fetch, add, update, remove, reorder }
})
