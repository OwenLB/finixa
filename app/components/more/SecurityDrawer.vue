<template>
  <AppDrawer v-model="open" :title="$t('more.security')">
    <div class="sec">

      <!-- Section mot de passe -->
      <section class="sec__section">
        <p class="sec__section-title">{{ $t('more.securityDrawer.passwordTitle') }}</p>

        <template v-if="!sent">
          <p class="sec__hint">{{ $t('more.securityDrawer.hint', { email: userEmail }) }}</p>
          <p v-if="error" class="sec__error">{{ error }}</p>
          <AppButton :disabled="loading" @click="sendLink">
            {{ loading ? $t('more.securityDrawer.sending') : $t('more.securityDrawer.sendLink') }}
          </AppButton>
        </template>

        <div v-else class="sec__sent">
          <p class="sec__sent-title">{{ $t('more.securityDrawer.sentTitle') }}</p>
          <p class="sec__sent-sub">{{ $t('more.securityDrawer.sentSub', { email: userEmail }) }}</p>
        </div>
      </section>

      <!-- Section code PIN -->
      <section class="sec__section">
        <p class="sec__section-title">{{ $t('pin.sectionTitle') }}</p>

        <template v-if="!pinStore.enabled">
          <p class="sec__hint">{{ $t('pin.sectionHint') }}</p>
          <AppButton @click="openSetup">{{ $t('pin.activate') }}</AppButton>
        </template>

        <template v-else>
          <div class="sec__pin-status">
            <ShieldCheck :size="16" class="sec__pin-icon" />
            <span>{{ $t('pin.enabled') }}</span>
          </div>
          <AppButton variant="ghost" @click="openSetup">{{ $t('pin.change') }}</AppButton>
          <AppButton v-if="!confirmDisable" variant="danger" @click="confirmDisable = true">
            {{ $t('pin.disable') }}
          </AppButton>
          <div v-else class="sec__confirm-row">
            <p class="sec__confirm-text">{{ $t('pin.disableConfirmText') }}</p>
            <div class="sec__confirm-btns">
              <AppButton variant="danger" @click="doDisable">{{ $t('pin.disableConfirm') }}</AppButton>
              <AppButton variant="ghost" @click="confirmDisable = false">{{ $t('common.cancel') }}</AppButton>
            </div>
          </div>
        </template>
      </section>

      <!-- Section biométrie -->
      <section v-if="pinStore.enabled && bioAvailable" class="sec__section">
        <p class="sec__section-title">{{ $t(`bio.kind.${bioStore.kind}`) }}</p>

        <template v-if="!bioStore.enabled">
          <p class="sec__hint">{{ $t('bio.sectionHint', { kind: $t(`bio.kind.${bioStore.kind}`) }) }}</p>
          <AppButton :disabled="bioLoading" @click="enableBio">
            {{ bioLoading ? $t('bio.enrolling') : $t(`bio.activate.${bioStore.kind}`) }}
          </AppButton>
        </template>

        <template v-else>
          <div class="sec__pin-status">
            <ScanFace :size="16" class="sec__pin-icon" />
            <span>{{ $t(`bio.kind.${bioStore.kind}`) }} · {{ $t('bio.enabledLabel') }}</span>
          </div>
          <AppButton v-if="!confirmDisableBio" variant="danger" @click="confirmDisableBio = true">
            {{ $t(`bio.disable.${bioStore.kind}`) }}
          </AppButton>
          <div v-else class="sec__confirm-row">
            <p class="sec__confirm-text">{{ $t('bio.disableConfirmText') }}</p>
            <div class="sec__confirm-btns">
              <AppButton variant="danger" @click="doDisableBio">{{ $t('bio.disableConfirm') }}</AppButton>
              <AppButton variant="ghost" @click="confirmDisableBio = false">{{ $t('common.cancel') }}</AppButton>
            </div>
          </div>
        </template>
      </section>

    </div>
  </AppDrawer>

  <AppPinSetupDrawer v-model="pinSetupOpen" />
</template>

<script setup lang="ts">
import { ShieldCheck, ScanFace } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const { t }    = useI18n()
const supabase = useSupabaseClient()
const user     = useSupabaseUser()
const pinStore = usePinStore()

const userEmail     = computed(() => user.value?.email ?? '')
const loading       = ref(false)
const error         = ref('')
const sent          = ref(false)
const pinSetupOpen      = ref(false)
const confirmDisable    = ref(false)
const bioStore          = useBiometricStore()
const bioAvailable      = ref(false)
const bioLoading        = ref(false)
const confirmDisableBio = ref(false)

onMounted(async () => {
  bioAvailable.value = await bioStore.checkAvailable()
})

watch(open, (val) => {
  if (!val) {
    error.value           = ''
    sent.value            = false
    confirmDisable.value  = false
    confirmDisableBio.value = false
  }
})

async function sendLink() {
  error.value   = ''
  loading.value = true
  const { error: err } = await supabase.auth.resetPasswordForEmail(userEmail.value, {
    redirectTo: getAuthRedirectUrl('/confirm'),
  })
  loading.value = false
  if (err) {
    error.value = t('more.securityDrawer.error')
  } else {
    sent.value = true
  }
}

function openSetup() {
  open.value        = false
  setTimeout(() => { pinSetupOpen.value = true }, 300)
}

function doDisable() {
  pinStore.disable()
  confirmDisable.value = false
}

async function resolveUser() {
  if (user.value?.id) return user.value
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

async function enableBio() {
  bioLoading.value = true
  const resolved = await resolveUser()
  if (!resolved?.id) { bioLoading.value = false; return }
  await bioStore.register(resolved.id, resolved.email ?? '')
  bioLoading.value = false
}

function doDisableBio() {
  bioStore.disable()
  confirmDisableBio.value = false
}
</script>

<style scoped lang="scss">
.sec {
  display: flex;
  flex-direction: column;
  gap: 24px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  &__section-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__hint {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__error {
    font-size: 0.85rem;
    color: var(--color-danger);
  }

  &__sent {
    padding: 16px;
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__sent-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__sent-sub {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__pin-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-success);
    padding: 4px 0;
  }

  &__pin-icon { flex-shrink: 0; }

  &__confirm-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
  }

  &__confirm-text {
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  &__confirm-btns {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

}
</style>
