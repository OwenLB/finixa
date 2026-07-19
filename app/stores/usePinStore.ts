import { defineStore } from 'pinia'

const KEY_HASH    = 'finixa-pin-hash'
const KEY_ENABLED = 'finixa-pin-enabled'
const KEY_SHOWN   = 'finixa-pin-shown'

export const usePinStore = defineStore('pin', () => {
  const user = useSupabaseUser()

  function key(base: string): string {
    return user.value?.id ? `${base}:${user.value.id}` : base
  }

  const enabled    = ref(false)
  const setupShown = ref(false)
  const isLocked   = ref(false)
  const failCount  = ref(0)

  function syncFromStorage(): void {
    enabled.value    = localStorage.getItem(key(KEY_ENABLED)) === 'true'
    setupShown.value = localStorage.getItem(key(KEY_SHOWN)) === 'true'
    isLocked.value   = false
    failCount.value  = 0
  }

  syncFromStorage()
  watch(() => user.value?.id, () => syncFromStorage())

  async function hashPin(pin: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('finixa:' + pin))
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function setup(pin: string): Promise<void> {
    localStorage.setItem(key(KEY_HASH),    await hashPin(pin))
    localStorage.setItem(key(KEY_ENABLED), 'true')
    localStorage.setItem(key(KEY_SHOWN),   'true')
    enabled.value    = true
    setupShown.value = true
  }

  async function verify(pin: string): Promise<boolean> {
    const stored = localStorage.getItem(key(KEY_HASH))
    if (!stored) return false
    const ok = (await hashPin(pin)) === stored
    failCount.value = ok ? 0 : failCount.value + 1
    return ok
  }

  function disable(): void {
    localStorage.removeItem(key(KEY_HASH))
    localStorage.setItem(key(KEY_ENABLED), 'false')
    enabled.value   = false
    isLocked.value  = false
    failCount.value = 0
  }

  function lock(): void {
    if (enabled.value) isLocked.value = true
  }

  function unlock(): void {
    isLocked.value  = false
    failCount.value = 0
    sessionStorage.setItem('finixa-unlocked-at', String(Date.now()))
  }

  function markSetupShown(): void {
    localStorage.setItem(key(KEY_SHOWN), 'true')
    setupShown.value = true
  }

  function resetSetupShown(): void {
    localStorage.removeItem(key(KEY_SHOWN))
    setupShown.value = false
  }

  return { enabled, setupShown, isLocked, failCount, setup, verify, disable, lock, unlock, markSetupShown, resetSetupShown }
})
