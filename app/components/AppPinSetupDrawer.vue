<template>
  <AppDrawer v-model="open" :title="drawerTitle" desktop-variant="center">

    <!-- ── Intro (première fois) ───────────────────────────────────── -->
    <template v-if="step === 'intro'">
      <div class="setup__intro">
        <div class="setup__intro-icon">
          <ShieldCheck :size="32" />
        </div>
        <p class="setup__intro-title">{{ $t('pin.setupTitle') }}</p>
        <p class="setup__intro-desc">{{ $t('pin.setupDesc') }}</p>
      </div>
      <AppButton @click="step = 'enter'">{{ $t('pin.activate') }}</AppButton>
      <button class="setup__skip" @click="skip">{{ $t('pin.later') }}</button>
    </template>

    <!-- ── Saisie du code ─────────────────────────────────────────── -->
    <template v-else-if="step === 'enter' || step === 'confirm'">
      <p class="setup__hint">
        {{ step === 'enter' ? $t('pin.choosePin') : $t('pin.confirmPin') }}
      </p>

      <div
        class="setup__dots"
        :class="{ 'setup__dots--shake': shaking }"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="setup__dot"
          :class="{ 'setup__dot--filled': currentInput.length >= i }"
        />
      </div>

      <Transition name="setup-err">
        <p v-if="errorMsg" class="setup__error">{{ errorMsg }}</p>
      </Transition>

      <div class="setup__pad">
        <button
          v-for="(key, idx) in KEYS"
          :key="idx"
          class="setup__key"
          :class="{
            'setup__key--hidden': key === '',
            'setup__key--del':    key === 'del',
          }"
          @click="onKey(key)"
        >
          <Delete v-if="key === 'del'" :size="18" />
          <span v-else-if="key !== ''">{{ key }}</span>
        </button>
      </div>
    </template>

    <!-- ── Succès ──────────────────────────────────────────────────── -->
    <template v-else-if="step === 'success'">
      <div class="setup__success">
        <div class="setup__success-icon">
          <ShieldCheck :size="36" />
        </div>
        <p class="setup__success-title">{{ $t('pin.activated') }}</p>
        <p class="setup__success-sub">{{ $t('pin.activatedSub') }}</p>
      </div>
    </template>

    <!-- ── Biométrie ─────────────────────────────────────────────── -->
    <template v-else-if="step === 'biometric'">
      <div class="setup__intro">
        <div class="setup__intro-icon">
          <ScanFace :size="32" />
        </div>
        <p class="setup__intro-title">{{ $t(`bio.kind.${bioStore.kind}`) }}</p>
        <p class="setup__intro-desc">{{ $t('bio.setupDesc', { kind: $t(`bio.kind.${bioStore.kind}`) }) }}</p>
      </div>
      <AppButton :disabled="bioLoading" @click="enableBio">
        {{ bioLoading ? $t('bio.enrolling') : $t(`bio.activate.${bioStore.kind}`) }}
      </AppButton>
      <button class="setup__skip" @click="closeBio">{{ $t('bio.later') }}</button>
    </template>

  </AppDrawer>
</template>

<script setup lang="ts">
import { ShieldCheck, Delete, ScanFace } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  showIntro?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'success': []
}>()

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'] as const
type Key   = typeof KEYS[number]
type Step  = 'intro' | 'enter' | 'confirm' | 'success' | 'biometric'

const pinStore = usePinStore()
const bioStore = useBiometricStore()
const user     = useSupabaseUser()
const supabase = useSupabaseClient()
const { t }    = useI18n()

const bioLoading = ref(false)

async function resolveUser() {
  if (user.value?.id) return user.value
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const step      = ref<Step>(props.showIntro ? 'intro' : 'enter')
const pinEnter  = ref('')
const pinConfirm = ref('')
const shaking   = ref(false)
const errorMsg  = ref('')

const currentInput = computed(() => step.value === 'enter' ? pinEnter.value : pinConfirm.value)

const drawerTitle = computed(() => {
  if (step.value === 'intro' || step.value === 'success' || step.value === 'biometric') return ''
  return t('pin.setupDrawerTitle')
})

watch(open, (val) => {
  if (val) reset()
})

function reset() {
  step.value       = props.showIntro ? 'intro' : 'enter'
  pinEnter.value   = ''
  pinConfirm.value = ''
  errorMsg.value   = ''
  shaking.value    = false
}

function onKey(key: Key) {
  if (key === '') return

  if (key === 'del') {
    if (step.value === 'enter')   pinEnter.value   = pinEnter.value.slice(0, -1)
    if (step.value === 'confirm') pinConfirm.value = pinConfirm.value.slice(0, -1)
    errorMsg.value = ''
    return
  }

  if (step.value === 'enter') {
    if (pinEnter.value.length >= 4) return
    pinEnter.value += key
    if (pinEnter.value.length === 4) {
      step.value = 'confirm'
    }
  } else if (step.value === 'confirm') {
    if (pinConfirm.value.length >= 4) return
    pinConfirm.value += key
    if (pinConfirm.value.length === 4) validateConfirm()
  }
}

async function validateConfirm() {
  if (pinEnter.value === pinConfirm.value) {
    await pinStore.setup(pinEnter.value)
    step.value = 'success'
    setTimeout(async () => {
      if (!bioStore.enabled && await bioStore.checkAvailable()) {
        step.value = 'biometric'
      } else {
        open.value = false
        emit('success')
      }
    }, 1400)
  } else {
    shaking.value    = true
    errorMsg.value   = t('pin.mismatch')
    pinConfirm.value = ''
    setTimeout(() => { shaking.value = false }, 450)
  }
}

async function enableBio() {
  bioLoading.value = true
  const resolved = await resolveUser()
  if (!resolved?.id) {
    bioLoading.value = false
    return
  }
  const ok = await bioStore.register(resolved.id, resolved.email ?? '')
  bioLoading.value = false
  if (ok) {
    open.value = false
    emit('success')
  }
  // si échec : on reste sur l'étape biométrie pour voir le debug
}

function closeBio() {
  open.value = false
  emit('success')
}

function skip() {
  pinStore.markSetupShown()
  open.value = false
}
</script>

<style scoped lang="scss">
.setup {
  &__intro {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 8px 0 4px;
    text-align: center;
  }

  &__intro-icon {
    width: 64px;
    height: 64px;
    background: var(--color-bg-elevated);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
    margin-bottom: 4px;
  }

  &__intro-title {
    font-family: var(--font-title);
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__intro-desc {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.55;
    max-width: 280px;
  }

  &__skip {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    text-align: center;
    transition: color $transition-fast;

    &:active { opacity: 0.7; }
  }

  &__hint {
    @include label-caps;
    text-align: center;
    letter-spacing: 0.1em;
  }

  &__dots {
    display: flex;
    gap: 18px;
    justify-content: center;

    &--shake { animation: setup-shake 420ms ease; }
  }

  &__dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    transition: background $transition-fast, border-color $transition-fast, transform 100ms ease;

    &--filled {
      background: var(--color-accent);
      border-color: var(--color-accent);
      transform: scale(1.12);
    }
  }

  &__error {
    font-size: 13px;
    color: var(--color-danger);
    text-align: center;
  }

  &__pad {
    display: grid;
    grid-template-columns: repeat(3, 64px);
    grid-template-rows: repeat(4, 64px);
    gap: 10px;
    justify-content: center;
  }

  &__key {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--color-bg-elevated);
    font-family: var(--font-title);
    font-size: 1.4rem;
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
      transform: scale(0.92);
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

  &__success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px 0 24px;
    text-align: center;
  }

  &__success-icon {
    width: 64px;
    height: 64px;
    background: rgba(52, 211, 153, 0.15);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-success);
  }

  &__success-title {
    font-family: var(--font-title);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__success-sub {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
}

// ── Transitions ────────────────────────────────────────────────────
.setup-err-enter-active { transition: opacity 200ms ease, transform 200ms ease; }
.setup-err-leave-active { transition: opacity 150ms ease; }
.setup-err-enter-from   { opacity: 0; transform: translateY(-4px); }
.setup-err-leave-to     { opacity: 0; }

@keyframes setup-shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-8px); }
  40%     { transform: translateX(8px); }
  60%     { transform: translateX(-5px); }
  80%     { transform: translateX(5px); }
}

</style>
