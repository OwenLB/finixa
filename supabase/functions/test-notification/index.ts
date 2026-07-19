import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  'mailto:contact@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

interface NotifPrefs {
  enabled:       boolean
  hour:          number
  timezone:      string
  inactivity:    { enabled: boolean; days: number }
  uncategorized: { enabled: boolean; threshold: number }
  pending:       { enabled: boolean; threshold: number }
}

const DEFAULT_PREFS: NotifPrefs = {
  enabled:       true,
  hour:          18,
  timezone:      'UTC',
  inactivity:    { enabled: true, days: 3 },
  uncategorized: { enabled: true, threshold: 1 },
  pending:       { enabled: true, threshold: 5 },
}

function mergePrefs(raw: Partial<NotifPrefs> | null): NotifPrefs {
  if (!raw) return DEFAULT_PREFS
  return {
    ...DEFAULT_PREFS,
    ...raw,
    inactivity:    { ...DEFAULT_PREFS.inactivity,    ...raw.inactivity },
    uncategorized: { ...DEFAULT_PREFS.uncategorized, ...raw.uncategorized },
    pending:       { ...DEFAULT_PREFS.pending,       ...raw.pending },
  }
}

async function sendPush(subs: { endpoint: string; p256dh: string; auth: string }[], title: string, body: string) {
  const payload = JSON.stringify({ title, body })
  await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ).catch((err) => console.error('[push] send error:', err?.message ?? err))
    )
  )
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Vérifier l'utilisateur authentifié via le JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const userId = user.id
  const { type } = await req.json() as { type: 'inactivity' | 'digest' | 'tonight' }

  if (!['inactivity', 'digest', 'tonight'].includes(type))
    return json({ error: 'Invalid type' }, 400)

  // Récupérer les souscriptions et prefs de l'utilisateur
  const [{ data: subs }, { data: prefRow }] = await Promise.all([
    supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId),
    supabase.from('user_preferences').select('notification_prefs').eq('user_id', userId).maybeSingle(),
  ])

  if (!subs?.length) return json({ error: 'No subscriptions found' }, 404)

  const prefs = mergePrefs(prefRow?.notification_prefs ?? null)

  if (type === 'inactivity') {
    const { data: last } = await supabase
      .from('transactions')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)

    const days = last?.[0]
      ? Math.floor((Date.now() - new Date(last[0].date).getTime()) / 86_400_000)
      : null

    const body = days !== null
      ? `Rien de saisi depuis ${days} jour${days > 1 ? 's' : ''}`
      : 'Aucune transaction saisie'

    await sendPush(subs, 'Rappel de saisie', body)
    return json({ sent: true })
  }

  if (type === 'digest') {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 5)
    cutoff.setHours(0, 0, 0, 0)

    const [{ count: uncatCount }, { count: pendingCount }] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('categorized', false).gte('date', startOfMonth.toISOString()),
      supabase.from('transactions').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'pending').lt('date', cutoff.toISOString()),
    ])

    const parts: string[] = []
    const n = uncatCount ?? 0
    const p = pendingCount ?? 0
    if (n > 0) parts.push(`${n} non catégorisée${n > 1 ? 's' : ''}`)
    if (p > 0) parts.push(`${p} non pointée${p > 1 ? 's' : ''}`)

    await sendPush(subs, 'Rappel', parts.length > 0 ? parts.join(' · ') : 'Tout est à jour !')
    return json({ sent: true })
  }

  // type === 'tonight' : même logique de priorité que daily-digest, sans filtre d'heure
  const since = new Date()
  since.setDate(since.getDate() - prefs.inactivity.days)

  const { count: recentCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('date', since.toISOString())

  if (prefs.inactivity.enabled && (recentCount ?? 0) === 0) {
    const { data: last } = await supabase
      .from('transactions')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)

    const days = last?.[0]
      ? Math.floor((Date.now() - new Date(last[0].date).getTime()) / 86_400_000)
      : null

    const body = days !== null
      ? `Rien de saisi depuis ${days} jour${days > 1 ? 's' : ''}`
      : 'Aucune transaction saisie'

    await sendPush(subs, 'Rappel de saisie', body)
    return json({ sent: true, type: 'inactivity' })
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 5)
  cutoff.setHours(0, 0, 0, 0)

  const [{ count: uncatCount }, { count: pendingCount }] = await Promise.all([
    supabase.from('transactions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('categorized', false).gte('date', startOfMonth.toISOString()),
    supabase.from('transactions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'pending').lt('date', cutoff.toISOString()),
  ])

  const parts: string[] = []
  const n = uncatCount ?? 0
  const p = pendingCount ?? 0
  if (n > 0) parts.push(`${n} non catégorisée${n > 1 ? 's' : ''}`)
  if (p > 0) parts.push(`${p} non pointée${p > 1 ? 's' : ''}`)

  await sendPush(subs, parts.length > 0 ? 'Rappel' : 'Tout est à jour !', parts.length > 0 ? parts.join(' · ') : 'Rien à signaler ce soir')
  return json({ sent: true, type: 'digest' })
})
