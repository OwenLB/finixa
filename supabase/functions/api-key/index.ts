import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return json({ error: 'Non authentifié' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (!user || authError) return json({ error: 'Token invalide' }, 401)

  // GET → statut de la clé
  if (req.method === 'GET') {
    const { count } = await admin
      .from('user_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return json({ hasKey: (count ?? 0) > 0 })
  }

  // POST → (re)génération : une seule clé active par utilisateur
  if (req.method === 'POST') {
    const rawKey  = base64url(crypto.getRandomValues(new Uint8Array(32)))
    const keyHash = await sha256hex(rawKey)

    await admin.from('user_api_keys').delete().eq('user_id', user.id)

    const { error } = await admin
      .from('user_api_keys')
      .insert({ user_id: user.id, key_hash: keyHash })

    if (error) return json({ error: error.message }, 500)

    return json({ key: rawKey })
  }

  // DELETE → révocation
  if (req.method === 'DELETE') {
    await admin.from('user_api_keys').delete().eq('user_id', user.id)
    return json({ success: true })
  }

  return json({ error: 'Méthode non supportée' }, 405)
})
