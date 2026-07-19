import { defineStore } from 'pinia'
import { Capacitor } from '@capacitor/core'

const KEY_ENABLED = 'finixa-bio-enabled'
const KEY_CRED_ID = 'finixa-bio-cred'

export type BiometricKind = 'faceid' | 'touchid' | 'passkey'

function detectKind(): BiometricKind {
  if (typeof navigator === 'undefined') return 'passkey'
  const ua = navigator.userAgent

  if (/\biPhone\b|\biPod\b/.test(ua)) return 'faceid'
  if (/\biPad\b/.test(ua))            return 'touchid'

  const isMac      = /Macintosh|Mac OS X/.test(ua)
  const isChromium = /Chrome\/\d/.test(ua) || /Chromium\/\d/.test(ua)
  const isEdge     = /Edg\/\d/.test(ua)
  const isFirefox  = /Firefox\/\d/.test(ua)
  if (isMac && !isChromium && !isEdge && !isFirefox) return 'touchid'

  return 'passkey'
}

export const useBiometricStore = defineStore('biometric', () => {
  const user = useSupabaseUser()
  const kind = detectKind()

  function key(base: string): string {
    return user.value?.id ? `${base}:${user.value.id}` : base
  }

  const enabled      = ref(false)
  const credentialId = ref<string | null>(null)

  function syncFromStorage(): void {
    enabled.value      = localStorage.getItem(key(KEY_ENABLED)) === 'true'
    credentialId.value = localStorage.getItem(key(KEY_CRED_ID))
  }

  syncFromStorage()
  watch(() => user.value?.id, () => syncFromStorage())

  async function checkAvailable(): Promise<boolean> {
    // WKWebView (Capacitor) ne supporte pas WebAuthn — la biométrie native
    // (Face ID via plugin) viendra remplacer ce chemin plus tard.
    if (Capacitor.isNativePlatform()) return false
    if (!window.PublicKeyCredential) return false
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
      return false
    }
  }

  async function register(userId: string, userEmail: string): Promise<boolean> {
    if (!userId) return false
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Finixa', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(userId),
            name: userEmail,
            displayName: 'Finixa',
          },
          pubKeyCredParams: [
            { alg: -7,   type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null

      if (!cred) return false

      const b64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)))
      localStorage.setItem(key(KEY_CRED_ID), b64)
      localStorage.setItem(key(KEY_ENABLED), 'true')
      credentialId.value = b64
      enabled.value      = true
      return true
    } catch {
      return false
    }
  }

  async function authenticate(): Promise<boolean> {
    if (!credentialId.value) return false
    try {
      const rawId = Uint8Array.from(atob(credentialId.value), c => c.charCodeAt(0))
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: 'public-key', id: rawId }],
          userVerification: 'required',
          timeout: 60000,
        },
      })
      return assertion !== null
    } catch (err) {
      if ((err as { name?: string })?.name !== 'NotAllowedError') disable()
      return false
    }
  }

  function disable(): void {
    localStorage.removeItem(key(KEY_ENABLED))
    localStorage.removeItem(key(KEY_CRED_ID))
    enabled.value      = false
    credentialId.value = null
  }

  return { enabled, kind, checkAvailable, register, authenticate, disable }
})
