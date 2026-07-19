<template>
  <div class="forgot">
    <div class="forgot__header">
      <img src="/logo.svg" alt="Finixa" class="forgot__logo" />
      <h1 class="forgot__title">Finixa</h1>
      <p class="forgot__subtitle">{{ $t('forgotPassword.subtitle') }}</p>
    </div>

    <div v-if="sent" class="forgot__sent">
      <p>{{ $t('forgotPassword.sentTitle') }}</p>
      <p class="forgot__sent-sub">{{ $t('forgotPassword.sentSub') }}</p>
    </div>

    <form v-else class="forgot__form" @submit.prevent="submit">
      <AuthFormField
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="$t('forgotPassword.email')"
        placeholder="email@exemple.fr"
      />

      <p v-if="error" class="forgot__error">{{ error }}</p>

      <AppButton type="submit" :disabled="loading">
        {{ loading ? $t('forgotPassword.sending') : $t('forgotPassword.submit') }}
      </AppButton>
    </form>

    <p class="forgot__back">
      <NuxtLink to="/login">{{ $t('forgotPassword.backToLogin') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t }    = useI18n()
const supabase = useSupabaseClient()

const email   = ref('')
const loading = ref(false)
const error   = ref('')
const sent    = ref(false)

async function submit() {
  error.value   = ''
  loading.value = true
  const { error: err } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: getAuthRedirectUrl('/confirm'),
  })
  loading.value = false
  if (err) {
    error.value = t('forgotPassword.error')
  } else {
    sent.value = true
  }
}
</script>

<style scoped lang="scss">
.forgot {
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

  &__sent {
    text-align: center;
    padding: 24px;
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-weight: 500;
    line-height: 1.6;
  }

  &__sent-sub {
    margin-top: 8px;
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--color-text-secondary);
  }

  &__back {
    margin-top: 24px;
    text-align: center;
    font-size: 0.875rem;

    a {
      color: var(--color-accent);
      text-decoration: none;
      font-weight: 500;
      &:hover { text-decoration: underline; }
    }
  }
}
</style>
