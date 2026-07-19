// Digest quotidien de notifications push (cron horaire).
//
// Sécurité : la fonction est déployée avec --no-verify-jwt (le cron Supabase
// n'envoie pas de JWT utilisateur) — l'accès est protégé par un secret partagé
// dans le header `x-cron-secret`, à configurer :
//   supabase secrets set CRON_SECRET=<valeur aléatoire>
// et à passer dans le job cron (headers du pg_cron / scheduled function).
//
// Idempotence : `user_preferences.last_digest_sent_at` (migration 20260610) —
// un utilisateur ne reçoit pas deux digests à moins de 20 h d'intervalle,
// même si le cron est rejoué.
import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { type NotifPrefs, localHourFor, mergePrefs, inactivityBody, digestParts } from './logic.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_CONTACT') ?? 'mailto:contact@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

// Borne anti-doublon : < 24 h pour tolérer la dérive du cron horaire
const MIN_RESEND_MS = 20 * 60 * 60 * 1000
// Un endpoint push qui pend ne doit pas bloquer le digest des suivants
const PUSH_TIMEOUT_MS = 10_000

async function sendPush(subs: { endpoint: string; p256dh: string; auth: string }[], title: string, body: string) {
  const payload = JSON.stringify({ title, body })
  await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { timeout: PUSH_TIMEOUT_MS },
      ).catch(async (err) => {
        // 404/410 = souscription expirée côté push service → purge définitive
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          console.log('[push] souscription expirée purgée')
        } else {
          console.error('[push] send error:', err?.message ?? err)
        }
      })
    )
  )
}

async function processUser(row: { user_id: string; notification_prefs: Partial<NotifPrefs> | null; last_digest_sent_at: string | null }): Promise<boolean> {
  const prefs = mergePrefs(row.notification_prefs)
  if (!prefs.enabled) return false
  if (localHourFor(prefs.timezone) !== prefs.hour) return false

  // Idempotence : déjà servi dans la fenêtre courante
  if (row.last_digest_sent_at && Date.now() - new Date(row.last_digest_sent_at).getTime() < MIN_RESEND_MS) {
    return false
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', row.user_id)

  if (!subs?.length) return false

  async function markSent() {
    await supabase
      .from('user_preferences')
      .update({ last_digest_sent_at: new Date().toISOString() })
      .eq('user_id', row.user_id)
  }

  // ── 1. Vérifier l'inactivité ──────────────────────────────
  if (prefs.inactivity.enabled) {
    const since = new Date()
    since.setDate(since.getDate() - prefs.inactivity.days)

    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', row.user_id)
      .gte('date', since.toISOString())

    if ((count ?? 0) === 0) {
      const { data: last } = await supabase
        .from('transactions')
        .select('date')
        .eq('user_id', row.user_id)
        .order('date', { ascending: false })
        .limit(1)

      const days = last?.[0]
        ? Math.floor((Date.now() - new Date(last[0].date).getTime()) / 86_400_000)
        : null

      const body = inactivityBody(days)

      // Marquer AVANT l'envoi : en cas de crash pendant l'envoi, on préfère
      // un digest manqué à un doublon
      await markSent()
      await sendPush(subs, 'Rappel de saisie', body)
      return true // priorité inactivité — pas de digest
    }
  }

  // ── 2. Digest ménage ──────────────────────────────────────
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Requêtes uniquement si le critère est activé (évite des appels inutiles) ;
  // la mise en forme + seuils sont délégués à `digestParts` (testée).
  let uncategorized = 0
  if (prefs.uncategorized.enabled) {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', row.user_id)
      .eq('categorized', false)
      .gte('date', startOfMonth.toISOString())
    uncategorized = count ?? 0
  }

  let pending = 0
  if (prefs.pending.enabled) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 5)
    cutoff.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', row.user_id)
      .eq('status', 'pending')
      .lt('date', cutoff.toISOString())
    pending = count ?? 0
  }

  const parts = digestParts({ uncategorized, pending, prefs })

  if (parts.length > 0) {
    await markSent()
    await sendPush(subs, 'Rappel', parts.join(' · '))
    return true
  }

  return false
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: userPrefs, error } = await supabase
    .from('user_preferences')
    .select('user_id, notification_prefs, last_digest_sent_at')

  if (error) {
    console.error('[digest] fetch prefs error:', error.message)
    return Response.json({ error: 'internal error' }, { status: 500 })
  }
  if (!userPrefs?.length) return Response.json({ sent: 0 })

  let sent = 0
  let failed = 0

  for (const row of userPrefs) {
    // Isolation par utilisateur : un timezone invalide ou une erreur ponctuelle
    // ne doit pas priver tous les utilisateurs suivants de leur digest
    try {
      if (await processUser(row)) sent++
    } catch (err) {
      failed++
      console.error('[digest] user processing error:', err instanceof Error ? err.message : err)
    }
  }

  return Response.json({ sent, failed })
})
