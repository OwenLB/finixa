// Versionnée depuis la prod le 2026-06-10 (déployée avec --no-verify-jwt :
// authentification par clé API utilisateur, cf. user_api_keys).
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

const SKIP_PLACEHOLDER = '— Passer —'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  const keyHash = await sha256hex(authHeader.slice(7))
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

  const url      = new URL(req.url)
  const category = url.searchParams.get('category')?.trim().normalize('NFC')

  if (category) {
    // Placeholder "passer" → liste vide
    if (category.startsWith('—')) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      )
    }

    // Résolution de la catégorie : par UUID ou par nom (insensible à la casse)
    let catId: string | null = null
    if (UUID_RE.test(category)) {
      catId = category
    } else {
      const { data: cats } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', keyRow.user_id)
        .ilike('name', category)
        .limit(1)
      catId = cats?.[0]?.id ?? null
    }

    if (!catId) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      )
    }

    const { data: subs } = await supabase
      .from('subcategories')
      .select('id, name')
      .eq('user_id', keyRow.user_id)
      .eq('category_id', catId)
      .is('valid_to', null)
      .order('sort_order')

    const items = [
      { id: null, name: SKIP_PLACEHOLDER },
      ...(subs ?? []).map(s => ({ id: s.id, name: s.name })),
    ]
    return new Response(
      JSON.stringify(items),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  // Pas de paramètre → liste des catégories dépenses
  const { data: allCats } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', keyRow.user_id)
    .eq('type', 'depense')
    .order('sort_order')

  const items = [
    { id: null, name: SKIP_PLACEHOLDER },
    ...(allCats ?? []).map(c => ({ id: c.id, name: c.name })),
  ]
  return new Response(
    JSON.stringify(items),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
  )
})
