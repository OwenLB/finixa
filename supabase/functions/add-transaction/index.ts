// Versionnée depuis la prod le 2026-06-10 (déployée avec --no-verify-jwt :
// authentification par clé API utilisateur, cf. user_api_keys).
// Dettes connues : type non whitelisté, date non validée.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const EMPTY_PLACEHOLDERS = new Set(['', '—', '-', 'null', 'undefined', 'none'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isEmpty(val: string | undefined): boolean {
  if (!val) return true
  const trimmed = val.trim()
  return EMPTY_PLACEHOLDERS.has(trimmed) || trimmed.startsWith('—')
}

function isUUID(val: string): boolean { return UUID_RE.test(val) }

function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const normalized = String(raw).trim().replace(',', '.')
  const n = Number(normalized)
  return isNaN(n) ? null : n
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Clé API manquante' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  const rawKey  = authHeader.slice(7)
  const keyHash = await sha256hex(rawKey)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: keyRow } = await supabase
    .from('user_api_keys')
    .select('user_id')
    .eq('key_hash', keyHash)
    .single()

  if (!keyRow) {
    return new Response(
      JSON.stringify({ error: 'Clé API invalide' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  let body: { amount?: unknown; label?: string; category?: string; subcategory?: string; type?: string; date?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Corps JSON invalide' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  const { label, type = 'depense', date } = body
  const category    = isEmpty(body.category)    ? undefined : body.category?.trim()
  const subcategory = isEmpty(body.subcategory) ? undefined : body.subcategory?.trim()

  const amount = parseAmount(body.amount)
  if (amount === null || amount === 0) {
    return new Response(
      JSON.stringify({ error: 'Le champ amount est requis et doit être non nul' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  let categoryValue: string | undefined = subcategory || category

  if (subcategory && isUUID(subcategory)) {
    // UUID de sous-catégorie fourni directement — pas de lookup nécessaire
    categoryValue = subcategory
  } else if (subcategory && category) {
    // Lookup par nom : résolution catégorie puis sous-catégorie
    const catQuery = supabase.from('categories').select('id').eq('user_id', keyRow.user_id)
    const { data: catRow } = isUUID(category)
      ? await catQuery.eq('id', category).single()
      : await catQuery.eq('name', category).eq('type', type).single()

    if (catRow) {
      const { data: subRow } = await supabase
        .from('subcategories')
        .select('id')
        .eq('name', subcategory)
        .eq('category_id', catRow.id)
        .is('valid_to', null)
        .single()

      if (subRow) categoryValue = subRow.id
    }
  } else if (category && isUUID(category)) {
    // UUID de catégorie fourni directement sans sous-catégorie
    categoryValue = category
  }

  const signedAmount = type === 'revenu'
    ? Math.abs(amount)
    : -Math.abs(amount)

  const txDate = date ?? new Date().toISOString().slice(0, 10)

  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      user_id:     keyRow.user_id,
      name:        label?.trim() || subcategory || category || 'Transaction',
      category:    categoryValue ?? '',
      categorized: !!categoryValue,
      amount:      signedAmount,
      date:        txDate + 'T12:00:00',
      type,
      status:      'pending',
    })
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  return new Response(
    JSON.stringify({ success: true, transaction: tx }),
    { status: 201, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
  )
})
