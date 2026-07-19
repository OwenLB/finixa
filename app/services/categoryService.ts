import type { SupabaseClient } from '@supabase/supabase-js'
import type { TransactionType, EnvelopeKey, ManagedCategory, SubCategory  } from '~/types'
import { currentMonthKey } from '~/utils/period'
import { budgetForMonth } from '~/utils/budgetForMonth'

export async function fetchCategories(client: SupabaseClient): Promise<ManagedCategory[]> {
  const [catsRes, subsRes, budgetsRes, subBudgetsRes] = await Promise.all([
    client.from('categories').select('*').order('sort_order'),
    client.from('subcategories').select('*').is('archived_at', null).order('sort_order'),
    client.rpc('get_category_budgets'),
    client.from('subcategory_budgets').select('subcategory_id, effective_from, budget'),
  ])
  const resError = catsRes.error ?? subsRes.error ?? budgetsRes.error ?? subBudgetsRes.error
  if (resError) throw new Error(resError.message)
  if (!catsRes.data || !subsRes.data) return []
  const budgetMap = new Map<string, number>(
    ((budgetsRes.data ?? []) as { id: string; total_budget: number }[])
      .map(b => [b.id, Number(b.total_budget)])
  )
  // Budget courant de chaque sous-catégorie = dernière version <= mois en cours
  const month = currentMonthKey()
  const versionsBySub = new Map<string, { effective_from: string; budget: number | null }[]>()
  for (const b of (subBudgetsRes.data ?? [])) {
    const arr = versionsBySub.get(b.subcategory_id) ?? []
    arr.push({ effective_from: b.effective_from, budget: b.budget })
    versionsBySub.set(b.subcategory_id, arr)
  }
  return catsRes.data.map(cat => ({
    id:            cat.id,
    name:          cat.name,
    type:          cat.type as TransactionType,
    iconKey:       cat.icon_key,
    color:         cat.color,
    isVariable:    cat.is_variable ?? false,
    excluded:      cat.excluded ?? false,
    totalBudget:   budgetMap.get(cat.id) ?? 0,
    subcategories: subsRes.data
      .filter(s => s.category_id === cat.id)
      .map(s => ({
        id:       s.id,
        name:     s.name,
        budget:   budgetForMonth(versionsBySub.get(s.id) ?? [], month),
        envelope: (s.envelope ?? null) as EnvelopeKey | null,
        excluded: s.excluded ?? false,
      })),
  }))
}

export async function fetchBudgetTotals(client: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await client.rpc('get_budget_totals')
  if (error) throw new Error(error.message)
  return new Map<string, number>(
    ((data ?? []) as { type: string; total_budget: number }[])
      .map(r => [r.type, Number(r.total_budget)])
  )
}

export async function insertCategory(
  client: SupabaseClient,
  userId: string,
  type: TransactionType,
  name: string,
  iconKey: string,
  color: string,
  sortOrder: number,
  isVariable = false,
): Promise<ManagedCategory | null> {
  const { data, error } = await client
    .from('categories')
    .insert({ user_id: userId, name: name.trim(), icon_key: iconKey, color, type, sort_order: sortOrder, is_variable: isVariable })
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (!data) return null
  return { id: data.id, name: data.name, type: data.type as TransactionType, iconKey: data.icon_key, color: data.color, isVariable: data.is_variable ?? false, excluded: data.excluded ?? false, totalBudget: 0, subcategories: [] }
}

export async function patchCategory(
  client: SupabaseClient,
  id: string,
  name: string,
  iconKey: string,
  color: string,
  isVariable: boolean,
  excluded = false,
): Promise<void> {
  const { error } = await client
    .from('categories')
    .update({ name: name.trim(), icon_key: iconKey, color, is_variable: isVariable, excluded })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function swapCategorySortOrder(
  client: SupabaseClient,
  idA: string,
  orderA: number,
  idB: string,
  orderB: number,
): Promise<void> {
  const [resA, resB] = await Promise.all([
    client.from('categories').update({ sort_order: orderA }).eq('id', idA),
    client.from('categories').update({ sort_order: orderB }).eq('id', idB),
  ])
  const error = resA.error ?? resB.error
  if (error) throw new Error(error.message)
}

export async function removeCategory(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function removeCategories(client: SupabaseClient, ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await client.from('categories').delete().in('id', ids)
  if (error) throw new Error(error.message)
}

export async function insertSubcategory(
  client: SupabaseClient,
  userId: string,
  catId: string,
  name: string,
  budget: number | null,
  sortOrder: number,
  validFrom: string,
  envelope: EnvelopeKey | null = null,
): Promise<SubCategory | null> {
  const { data, error } = await client
    .from('subcategories')
    .insert({ user_id: userId, category_id: catId, name: name.trim(), budget, sort_order: sortOrder, valid_from: validFrom, valid_to: null, envelope })
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (!data) return null
  // Historique de budget : version initiale au mois de création
  if (budget !== null) {
    const { error: bErr } = await client
      .from('subcategory_budgets')
      .upsert({ subcategory_id: data.id, effective_from: validFrom, budget })
    if (bErr) throw new Error(bErr.message)
  }
  return { id: data.id, name: data.name, budget: budget ?? null, envelope: (data.envelope ?? null) as EnvelopeKey | null, excluded: data.excluded ?? false }
}

export async function updateSubcategoryEnvelope(
  client: SupabaseClient,
  id: string,
  envelope: EnvelopeKey | null,
): Promise<void> {
  const { error } = await client.from('subcategories').update({ envelope }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateSubcategoryExcluded(
  client: SupabaseClient,
  id: string,
  excluded: boolean,
): Promise<void> {
  const { error } = await client.from('subcategories').update({ excluded }).eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Met à jour une sous-catégorie.
 * Identité stable : le nom est patché en place (rétroactif). Le budget est
 * upserté dans l'historique pour le mois courant — aucune nouvelle ligne de
 * sous-catégorie, donc aucune transaction décatégorisée.
 */
export async function updateSubcategory(
  client: SupabaseClient,
  id: string,
  name: string,
  newBudget: number | null,
  currentMonth: string,
): Promise<SubCategory | null> {
  const { data: existing, error: readError } = await client
    .from('subcategories').select('envelope, excluded').eq('id', id).single()
  if (readError) throw new Error(readError.message)

  const { error: patchError } = await client
    .from('subcategories').update({ name: name.trim(), budget: newBudget }).eq('id', id)
  if (patchError) throw new Error(patchError.message)

  const { error: budgetError } = await client
    .from('subcategory_budgets')
    .upsert({ subcategory_id: id, effective_from: currentMonth, budget: newBudget })
  if (budgetError) throw new Error(budgetError.message)

  return { id, name: name.trim(), budget: newBudget, envelope: (existing?.envelope ?? null) as EnvelopeKey | null, excluded: existing?.excluded ?? false }
}

export async function reorderCategories(
  client: SupabaseClient,
  cats: ManagedCategory[],
): Promise<void> {
  const results = await Promise.all(
    cats.map((c, i) =>
      client.from('categories').update({ sort_order: i }).eq('id', c.id)
    )
  )
  const error = results.find(r => r.error)?.error
  if (error) throw new Error(error.message)
}

export async function reorderSubcategories(
  client: SupabaseClient,
  subcategories: SubCategory[],
): Promise<void> {
  const results = await Promise.all(
    subcategories.map((s, i) =>
      client.from('subcategories').update({ sort_order: i }).eq('id', s.id)
    )
  )
  const error = results.find(r => r.error)?.error
  if (error) throw new Error(error.message)
}

/** Soft-delete : on archive (l'identité reste pour résoudre les transactions historiques). */
export async function removeSubcategory(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('subcategories').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}

export interface TemplateCategoryInput {
  name:          string
  type:          TransactionType
  iconKey:       string
  color:         string
  subcategories: Array<{ name: string; budget: number | null; envelope: EnvelopeKey | null }>
}

/**
 * Crée toutes les catégories et sous-catégories d'un template en deux requêtes bulk
 * au lieu d'une requête par entité.
 * Retourne le nombre de catégories créées.
 */
export async function bulkCreateFromTemplate(
  client: SupabaseClient,
  userId: string,
  categories: TemplateCategoryInput[],
  monthKey: string,
): Promise<number> {
  if (!categories.length) return 0

  const { data: createdCats, error: catErr } = await client
    .from('categories')
    .insert(categories.map((cat, i) => ({
      user_id:    userId,
      name:       cat.name.trim(),
      icon_key:   cat.iconKey,
      color:      cat.color,
      type:       cat.type,
      sort_order: i,
    })))
    .select()

  if (catErr) throw new Error(catErr.message)
  if (!createdCats?.length) return 0

  const subsToInsert = createdCats.flatMap(createdCat => {
    const tplCat = categories.find(c => c.name.trim() === createdCat.name)
    if (!tplCat) return []
    return tplCat.subcategories.map((sub, j) => ({
      user_id:     userId,
      category_id: createdCat.id as string,
      name:        sub.name.trim(),
      budget:      sub.budget,
      sort_order:  j,
      valid_from:  monthKey,
      valid_to:    null,
      envelope:    sub.envelope ?? null,
    }))
  })

  if (subsToInsert.length) {
    const { data: createdSubs, error: subErr } = await client.from('subcategories').insert(subsToInsert).select()
    if (subErr) throw new Error(subErr.message)
    // Historique de budget : version initiale au mois de création
    const budgetRows = (createdSubs ?? [])
      .filter(s => s.budget !== null)
      .map(s => ({ subcategory_id: s.id as string, effective_from: s.valid_from as string, budget: s.budget as number }))
    if (budgetRows.length) {
      const { error: bErr } = await client.from('subcategory_budgets').insert(budgetRows)
      if (bErr) throw new Error(bErr.message)
    }
  }

  return createdCats.length
}
