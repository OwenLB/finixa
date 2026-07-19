<template>
  <div class="login">
    <div class="login__header">
      <img src="/logo.svg" alt="Finixa" class="login__logo" />
      <h1 class="login__title">Finixa</h1>
      <p class="login__subtitle">{{ $t('login.subtitle') }}</p>
    </div>

    <!-- État OTP : saisie du code -->
    <div v-if="magicLinkSent" class="login__otp">
      <p class="login__otp-title">{{ $t('login.otpTitle') }}</p>
      <p class="login__otp-sub">{{ $t('login.otpSub', { email }) }}</p>
      <form class="login__otp-form" @submit.prevent="verifyCode">
        <div class="login__otp-cells">
          <input
            v-for="(_, i) in otpDigits"
            :key="i"
            :ref="el => { if (el) otpRefs[i] = el as HTMLInputElement }"
            v-model="otpDigits[i]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            :autocomplete="i === 0 ? 'one-time-code' : 'off'"
            class="login__otp-cell"
            :class="{ 'login__otp-cell--filled': otpDigits[i] }"
            @input="onOtpInput(i)"
            @keydown="onOtpKeydown($event, i)"
            @paste.prevent="onOtpPaste($event)"
            @focus="(e) => (e.target as HTMLInputElement).select()"
          />
        </div>
        <p v-if="otpError" class="login__error">{{ otpError }}</p>
        <AppButton type="submit" :disabled="otpLoading || otpCode.length < 6">
          {{ otpLoading ? $t('login.otpVerifying') : $t('login.otpSubmit') }}
        </AppButton>
      </form>
      <button class="login__back" @click="magicLinkSent = false">{{ $t('login.magicLinkBack') }}</button>
    </div>

    <!-- Formulaire -->
    <template v-else>
      <form class="login__form" @submit.prevent="submit">
        <AuthFormField
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          :label="$t('login.email')"
          placeholder="email@exemple.fr"
        />

        <AuthFormField
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          :label="$t('login.password')"
          placeholder="••••••••"
        />

        <p v-if="error" class="login__error">{{ error }}</p>

        <AppButton type="submit" :disabled="loading">
          {{ loading ? $t('login.connecting') : $t('login.submit') }}
        </AppButton>

        <NuxtLink to="/forgot-password" class="login__forgot">{{ $t('login.forgotPassword') }}</NuxtLink>
      </form>

      <div class="login__divider"><span>{{ $t('common.or') }}</span></div>

      <button class="login__magic" :disabled="magicLoading" @click="sendMagicLink">
        {{ magicLoading ? $t('login.magicLinkSending') : $t('login.magicLink') }}
      </button>

      <p class="login__register">
        {{ $t('login.noAccount') }}
        <NuxtLink to="/register">{{ $t('login.registerLink') }}</NuxtLink>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t }    = useI18n()
const supabase = useSupabaseClient()
const router   = useRouter()

const email         = ref('')
const password      = ref('')
const loading       = ref(false)
const magicLoading  = ref(false)
const error         = ref('')
const magicLinkSent = ref(false)
const otpDigits     = ref<string[]>(Array(6).fill(''))
const otpRefs       = ref<HTMLInputElement[]>([])
const otpLoading    = ref(false)
const otpError      = ref('')

const otpCode = computed(() => otpDigits.value.join(''))

async function submit() {
  error.value   = ''
  loading.value = true
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  loading.value = false
  if (err) {
    error.value = err.code === 'email_not_confirmed'
      ? t('login.errorEmailNotConfirmed')
      : t('login.error')
  } else {
    sessionStorage.setItem('finixa-unlocked-at', String(Date.now()))
    await router.push('/')
  }
}

async function sendMagicLink() {
  error.value        = ''
  magicLoading.value = true
  const { error: err } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: { shouldCreateUser: false },
  })
  magicLoading.value = false
  if (err) {
    error.value = err.code === 'over_email_send_rate_limit'
      ? t('login.errorMagicLinkRateLimit')
      : err.code === 'otp_disabled'
        ? t('login.errorMagicLinkNoAccount')
        : t('login.errorMagicLink')
  } else {
    otpDigits.value = Array(6).fill('')
    otpError.value  = ''
    magicLinkSent.value = true
    await nextTick()
    otpRefs.value[0]?.focus()
  }
}

function onOtpInput(i: number) {
  const val = otpDigits.value[i]
  // Garder seulement le dernier caractère numérique saisi
  otpDigits.value[i] = val.replace(/\D/g, '').slice(-1)
  if (otpDigits.value[i] && i < 5) {
    otpRefs.value[i + 1]?.focus()
  }
}

function onOtpKeydown(e: KeyboardEvent, i: number) {
  if (e.key === 'Backspace') {
    if (otpDigits.value[i]) {
      otpDigits.value[i] = ''
    } else if (i > 0) {
      otpDigits.value[i - 1] = ''
      otpRefs.value[i - 1]?.focus()
    }
    e.preventDefault()
  } else if (e.key === 'ArrowLeft' && i > 0) {
    otpRefs.value[i - 1]?.focus()
  } else if (e.key === 'ArrowRight' && i < 5) {
    otpRefs.value[i + 1]?.focus()
  }
}

function onOtpPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  const digits = text.replace(/\D/g, '').slice(0, 6).split('')
  digits.forEach((d, i) => { otpDigits.value[i] = d })
  const nextEmpty = digits.length < 6 ? digits.length : 5
  otpRefs.value[nextEmpty]?.focus()
}

async function verifyCode() {
  otpError.value  = ''
  otpLoading.value = true
  const { error: err } = await supabase.auth.verifyOtp({
    email: email.value,
    token: otpCode.value,
    type:  'email',
  })
  otpLoading.value = false
  if (err) {
    otpError.value = t('login.otpErrorInvalid')
    return
  }
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return
  const { data, error: prefErr } = await supabase
    .from('user_preferences')
    .select('onboarding_completed')
    .eq('user_id', authUser.id)
    .maybeSingle()
  sessionStorage.setItem('finixa-unlocked-at', String(Date.now()))
  // Onboarding uniquement si explicitement non terminé (sans erreur de lecture) ;
  // sinon accueil — app.vue redirigera proprement si vraiment nécessaire.
  await router.replace(!prefErr && data?.onboarding_completed === false ? '/onboarding' : '/')
}
</script>

<style scoped lang="scss">
.login {
  width: 100%;
  max-width: 360px;

  &__header {
    text-align: center;
    margin-bottom: 40px;
  }

  &__logo {
    width: 48px;
    height: auto;
    display: block;
    margin: 0 auto 12px;

    [data-theme='light'] & {
      filter: invert(1);
    }
  }

  &__title {
    font-family: var(--font-title);
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
  }

  &__subtitle {
    margin-top: 8px;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__error {
    font-size: 0.85rem;
    color: var(--color-danger);
    text-align: center;
  }

  &__forgot {
    display: block;
    text-align: center;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-decoration: none;

    &:hover { color: var(--color-accent); }
  }

  &__divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 24px 0 0;
    color: var(--color-text-muted);
    font-size: 0.8rem;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }
  }

  &__magic {
    width: 100%;
    margin-top: 12px;
    padding: 14px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: border-color $transition-fast, color $transition-fast;

    &:hover:not(:disabled) {
      border-color: var(--color-accent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__register {
    margin-top: 24px;
    text-align: center;
    font-size: 0.875rem;
    color: var(--color-text-secondary);

    a {
      color: var(--color-accent);
      text-decoration: none;
      font-weight: 500;

      &:hover { text-decoration: underline; }
    }
  }

  &__otp {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  &__otp-title {
    font-family: var(--font-title);
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
  }

  &__otp-sub {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__otp-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 8px;
  }

  &__otp-cells {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  &__otp-cell {
    width: 44px;
    height: 52px;
    background: var(--color-bg-surface);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-title);
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
    transition: border-color $transition-fast, background $transition-fast;
    caret-color: transparent;

    &:focus {
      outline: none;
      border-color: var(--color-accent);
      background: var(--color-bg-elevated);
    }

    &--filled {
      border-color: var(--color-accent);
    }
  }

  &__back {
    background: none;
    border: none;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 0;
    margin-top: 8px;

    &:hover { color: var(--color-accent); }
  }
}
</style>
