<template>
  <Transition name="pin-fade">
    <div class="pin-lock">

      <div class="pin-lock__header">
        <img src="/logo.svg" alt="Finixa" class="pin-lock__logo" />
      </div>

      <div class="pin-lock__body">
        <p class="pin-lock__label">{{ $t('pin.enterPin') }}</p>

        <div class="pin-lock__dots" :class="{ 'pin-lock__dots--shake': shaking }">
          <div
            v-for="i in PIN_LEN"
            :key="i"
            class="pin-lock__dot"
            :class="{ 'pin-lock__dot--filled': input.length >= i }"
          />
        </div>

        <Transition name="pin-err">
          <p v-if="errorMsg" class="pin-lock__error">{{ errorMsg }}</p>
        </Transition>
      </div>

      <div class="pin-lock__pad">
        <button
          v-for="(key, idx) in KEYS"
          :key="idx"
          class="pin-lock__key"
          :class="{
            'pin-lock__key--hidden': key === '',
            'pin-lock__key--del':    key === 'del',
          }"
          :aria-label="key === 'del' ? 'Supprimer' : key"
          @click="onKey(key)"
        >
          <Delete v-if="key === 'del'" :size="22" />
          <span v-else-if="key !== ''">{{ key }}</span>
        </button>
      </div>

      <div class="pin-lock__footer">
        <button
          v-if="bioStore.enabled"
          class="pin-lock__biometric"
          :disabled="bioLoading"
          @click="tryBiometric"
        >
          <ScanFace :size="20" />
          {{ $t(`bio.kind.${bioStore.kind}`) }}
        </button>

        <button
          class="pin-lock__logout"
          :class="{ 'pin-lock__logout--confirm': confirmingLogout }"
          @click="onLogoutTap"
        >
          {{ confirmingLogout ? $t('pin.logoutConfirm') : $t('pin.logout') }}
        </button>
      </div>

    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Delete, ScanFace } from 'lucide-vue-next'
import { signOutAndReload } from '~/utils/auth'

const PIN_LEN = 4
const KEYS    = ['1','2','3','4','5','6','7','8','9','','0','del'] as const
type Key      = typeof KEYS[number]

const pinStore = usePinStore()
const bioStore = useBiometricStore()
const supabase = useSupabaseClient()
const { t }    = useI18n()

const input            = ref('')
const shaking          = ref(false)
const errorMsg         = ref('')
const checking         = ref(false)
const confirmingLogout = ref(false)
const bioLoading       = ref(false)

let logoutTimer: ReturnType<typeof setTimeout> | null = null

function onKey(key: Key) {
  if (key === '') return
  if (key === 'del') {
    input.value    = input.value.slice(0, -1)
    errorMsg.value = ''
    return
  }
  if (input.value.length >= PIN_LEN || checking.value) return
  input.value += key
  if (input.value.length === PIN_LEN) checkPin()
}

async function checkPin() {
  checking.value = true
  const ok = await pinStore.verify(input.value)
  input.value    = ''
  checking.value = false

  if (ok) {
    pinStore.unlock()
    return
  }

  shaking.value = true
  setTimeout(() => { shaking.value = false }, 450)

  errorMsg.value = pinStore.failCount >= 5
    ? t('pin.tooManyAttempts')
    : t('pin.wrongPin', { n: 5 - pinStore.failCount })
}

function onLogoutTap() {
  if (!confirmingLogout.value) {
    confirmingLogout.value = true
    logoutTimer = setTimeout(() => { confirmingLogout.value = false }, 3000)
    return
  }
  doLogout()
}

async function doLogout() {
  pinStore.disable()
  sessionStorage.removeItem('finixa-unlocked-at')
  sessionStorage.removeItem('finixa-hidden-at')
  await signOutAndReload(supabase)
}

async function tryBiometric() {
  if (!bioStore.enabled || bioLoading.value) return
  bioLoading.value = true
  const ok = await bioStore.authenticate()
  bioLoading.value = false
  if (ok) pinStore.unlock()
}

onMounted(() => {
  if (bioStore.enabled) setTimeout(() => tryBiometric(), 600)
})

onUnmounted(() => {
  if (logoutTimer) clearTimeout(logoutTimer)
})
</script>

<style scoped lang="scss">
.pin-lock {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding:
    calc(env(safe-area-inset-top) + 52px)
    $page-padding-x
    calc(env(safe-area-inset-bottom) + 28px);

  &__header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__logo {
    width: 48px;
    height: 48px;
    object-fit: contain;

    [data-theme='light'] & { filter: invert(1); }
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    min-height: 0;
  }

  &__label {
    @include label-caps;
    letter-spacing: 0.12em;
    text-align: center;
  }

  &__dots {
    display: flex;
    gap: 20px;

    &--shake { animation: pin-shake 420ms ease; }
  }

  &__dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    transition: background $transition-fast, border-color $transition-fast, transform 100ms ease;

    &--filled {
      background: var(--color-accent);
      border-color: var(--color-accent);
      transform: scale(1.1);
    }
  }

  &__error {
    font-size: 13px;
    color: var(--color-danger);
    text-align: center;
    line-height: 1.4;
    max-width: 220px;
  }

  &__pad {
    display: grid;
    grid-template-columns: repeat(3, 76px);
    grid-template-rows: repeat(4, 76px);
    gap: 10px;
    flex: 0 0 auto;
  }

  &__key {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: var(--color-bg-elevated);
    font-family: var(--font-title);
    font-size: 1.65rem;
    font-weight: 500;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background $transition-fast, transform 80ms ease;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;

    &:active {
      background: var(--color-border);
      transform: scale(0.93);
    }

    &--hidden {
      visibility: hidden;
      pointer-events: none;
    }

    &--del {
      background: transparent;
      color: var(--color-text-muted);
    }
  }

  &__footer {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-top: 12px;
  }

  &__biometric {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    border-radius: 50px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    font-size: 14px;
    font-weight: 500;
    color: var(--color-accent);
    cursor: pointer;
    transition: background $transition-fast, transform 80ms ease;
    -webkit-tap-highlight-color: transparent;

    &:active:not(:disabled) {
      background: var(--color-border);
      transform: scale(0.96);
    }

    &:disabled { opacity: 0.45; cursor: default; }
  }

  &__logout {
    font-size: 13px;
    color: var(--color-text-muted);
    background: none;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: color $transition-fast, background $transition-fast;

    &:active { opacity: 0.7; }

    &--confirm {
      color: var(--color-danger);
      background: rgba(248, 113, 113, 0.1);
    }
  }
}

// ── Transition overlay ─────────────────────────────────────────────
.pin-fade-enter-active { transition: opacity 180ms ease; }
.pin-fade-leave-active { transition: opacity 250ms ease; }
.pin-fade-enter-from, .pin-fade-leave-to { opacity: 0; }

// ── Transition error message ───────────────────────────────────────
.pin-err-enter-active { transition: opacity 200ms ease, transform 200ms ease; }
.pin-err-leave-active { transition: opacity 150ms ease; }
.pin-err-enter-from   { opacity: 0; transform: translateY(-4px); }
.pin-err-leave-to     { opacity: 0; }

// ── Shake animation ────────────────────────────────────────────────
@keyframes pin-shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-9px); }
  40%     { transform: translateX(9px); }
  60%     { transform: translateX(-5px); }
  80%     { transform: translateX(5px); }
}
</style>
