import { Capacitor } from '@capacitor/core'
import { PENDING_LATE_DAYS } from '~/utils/constants'
import type { Json } from '~/types/database.types'

export interface NotificationPrefs {
  enabled:       boolean
  hour:          number
  timezone:      string
  inactivity:    { enabled: boolean; days: number }
  uncategorized: { enabled: boolean; threshold: number }
  pending:       { enabled: boolean; threshold: number }
}

const STORAGE_KEY = 'finixa-notif-prefs'

const defaultPrefs: NotificationPrefs = {
  enabled:       true,
  hour:          18,
  timezone:      'UTC',
  inactivity:    { enabled: true, days: 3 },
  uncategorized: { enabled: true, threshold: 1 },
  pending:       { enabled: true, threshold: 5 },
}

function parsePrefs(raw: unknown): NotificationPrefs {
  const p = (raw && typeof raw === 'object') ? raw as Partial<NotificationPrefs> : {}
  return {
    ...defaultPrefs,
    ...p,
    inactivity:    { ...defaultPrefs.inactivity,    ...p.inactivity },
    uncategorized: { ...defaultPrefs.uncategorized, ...p.uncategorized },
    pending:       { ...defaultPrefs.pending,       ...p.pending },
  }
}

function loadLocalPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return { ...defaultPrefs }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...defaultPrefs }
    const parsed = JSON.parse(stored)
    // Migration : ancien format avec time string
    if (parsed.time !== undefined && parsed.hour === undefined)
      parsed.hour = parseInt(parsed.time.split(':')[0], 10)
    return parsePrefs(parsed)
  } catch {
    return { ...defaultPrefs }
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...binary].map(c => c.charCodeAt(0)))
}

// ── Singleton state ────────────────────────────────────────────
const prefs        = useState<NotificationPrefs>('notif-prefs', loadLocalPrefs)
const isSubscribed = useState('notif-subscribed', () => false)
const loading      = useState('notif-loading', () => false)

let _prefSyncTimer: ReturnType<typeof setTimeout> | null = null
let _initDone = false

// ──────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const supabase = useSupabaseClient()
  const user     = useSupabaseUser()
  const txStore  = useTransactionStore()

  // ── Capabilités ──────────────────────────────────────────────
  // Web Push (service worker + VAPID) n'existe pas dans la WebView
  // Capacitor : en natif, la feature est masquée (APNs viendra plus tard).
  const isSupported = computed(() =>
    typeof window !== 'undefined' &&
    !Capacitor.isNativePlatform() &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  )

  const isStandalone = computed(() => {
    if (typeof window === 'undefined') return false
    const mediaQuery = window.matchMedia('(display-mode: standalone)').matches
    const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    return mediaQuery || navStandalone
  })

  const isIos = computed(() =>
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent)
  )

  const showInstallBanner = computed(() =>
    isIos.value && !isStandalone.value && !Capacitor.isNativePlatform()
  )

  const permission = computed<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  // ── Données TX ───────────────────────────────────────────────
  const realTransactions = computed(() =>
    txStore.transactions.filter(t => !t.virtual)
  )

  const uncategorizedCount = computed(() =>
    realTransactions.value.filter(t => !t.categorized).length
  )

  const pendingCount = computed(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - PENDING_LATE_DAYS)
    cutoff.setHours(0, 0, 0, 0)
    return realTransactions.value.filter(t =>
      t.status === 'pending' &&
      new Date(t.date.slice(0, 10) + 'T12:00:00') < cutoff
    ).length
  })

  const daysSinceLastEntry = computed(() => {
    if (!realTransactions.value.length) return null
    const last = Math.max(...realTransactions.value.map(t => new Date(t.date).getTime()))
    return Math.floor((Date.now() - last) / 86_400_000)
  })

  async function getUserId(): Promise<string | null> {
    if (user.value?.id) return user.value.id
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  // ── Init : charge prefs depuis Supabase + vérifie souscription ──
  async function init() {
    if (_initDone) return
    const userId = await getUserId()
    if (!userId) return
    _initDone = true

    // Statut souscription depuis le navigateur
    if (isSupported.value) {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        isSubscribed.value = sub !== null
      } catch {
        // Service worker / Push API indisponible : on considère non abonné
      }
    }

    // Prefs depuis Supabase (écrase localStorage si différentes)
    const { data } = await supabase
      .from('user_preferences')
      .select('notification_prefs')
      .eq('user_id', userId)
      .maybeSingle()

    if (data?.notification_prefs) {
      const remote = parsePrefs(data.notification_prefs)
      prefs.value = remote
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
    }

    // Mettre à jour le fuseau horaire depuis le navigateur si absent ou générique
    if (!prefs.value.timezone || prefs.value.timezone === 'UTC') {
      prefs.value.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  // ── Sync prefs → Supabase (debounce 800ms) ───────────────────
  function schedulePrefSync() {
    if (_prefSyncTimer) clearTimeout(_prefSyncTimer)
    _prefSyncTimer = setTimeout(async () => {
      const userId = await getUserId()
      if (!userId) return
      await supabase
        .from('user_preferences')
        .update({ notification_prefs: prefs.value as unknown as Json })
        .eq('user_id', userId)
    }, 800)
  }

  watch(prefs, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    schedulePrefSync()
  }, { deep: true })

  // ── Subscribe ────────────────────────────────────────────────
  async function subscribe() {
    if (!isSupported.value || loading.value) return

    prefs.value.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    loading.value = true
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
      }

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }

      const userId = await getUserId()
      if (!userId) return

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id:  userId,
        endpoint: json.endpoint,
        p256dh:   json.keys.p256dh,
        auth:     json.keys.auth,
      }, { onConflict: 'endpoint' })

      if (error) return

      isSubscribed.value = true
    } catch {
      // souscription échouée silencieusement
    } finally {
      loading.value = false
    }
  }

  // ── Unsubscribe ──────────────────────────────────────────────
  async function unsubscribe() {
    if (loading.value) return
    loading.value = true
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      isSubscribed.value = false
    } finally {
      loading.value = false
    }
  }

  // ── Logique de priorité ce soir ──────────────────────────────
  const tonightNotification = computed<{ type: 'inactivity' | 'digest'; label: string; detail: string } | null>(() => {
    if (!prefs.value.enabled || !isSubscribed.value) return null

    const days = daysSinceLastEntry.value
    if (prefs.value.inactivity.enabled && days !== null && days >= prefs.value.inactivity.days) {
      return {
        type:   'inactivity',
        label:  'Rappel de saisie',
        detail: `Rien de saisi depuis ${days} jour${days > 1 ? 's' : ''}`,
      }
    }

    const parts: string[] = []
    const n = uncategorizedCount.value
    const p = pendingCount.value
    if (prefs.value.uncategorized.enabled && n >= prefs.value.uncategorized.threshold)
      parts.push(`${n} non catégorisée${n > 1 ? 's' : ''}`)
    if (prefs.value.pending.enabled && p >= prefs.value.pending.threshold)
      parts.push(`${p} non pointée${p > 1 ? 's' : ''}`)

    if (parts.length > 0) return { type: 'digest', label: 'Rappel', detail: parts.join(' · ') }
    return null
  })

  // ── Tests via edge function ──────────────────────────────────
  async function invokeTest(type: 'inactivity' | 'digest' | 'tonight') {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const { error: fnError } = await supabase.functions.invoke('test-notification', {
        method:  'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body:    { type },
      })
      if (fnError) console.error('[push] test error:', fnError)
    } catch (err) {
      console.error('[push] test error:', err)
    }
  }

  async function testInactivity() { await invokeTest('inactivity') }
  async function testDigest()     { await invokeTest('digest') }
  async function testTonight()    { await invokeTest('tonight') }

  return {
    isSupported,
    isStandalone,
    isIos,
    showInstallBanner,
    permission,
    prefs,
    isSubscribed,
    loading,
    uncategorizedCount,
    pendingCount,
    daysSinceLastEntry,
    tonightNotification,
    init,
    subscribe,
    unsubscribe,
    testInactivity,
    testDigest,
    testTonight,
  }
}
