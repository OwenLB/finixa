<template>
  <div class="reset">
    <div class="reset__header">
      <img src="/logo.svg" alt="Finixa" class="reset__logo" />
      <h1 class="reset__title">Finixa</h1>
      <p class="reset__subtitle">{{ $t('resetPassword.subtitle') }}</p>
    </div>

    <div v-if="done" class="reset__done">
      <p>{{ $t('resetPassword.doneTitle') }}</p>
      <p class="reset__done-sub">{{ $t('resetPassword.doneSub') }}</p>
      <NuxtLink to="/login" class="reset__link">{{ $t('resetPassword.backToLogin') }}</NuxtLink>
    </div>

    <form v-else class="reset__form" @submit.prevent="submit">
      <AuthFormField
        id="password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        :label="$t('resetPassword.password')"
        placeholder="••••••••"
      />

      <AuthFormField
        id="confirm"
        v-model="confirm"
        type="password"
        autocomplete="new-password"
        :label="$t('resetPassword.confirm')"
        placeholder="••••••••"
      />

      <p v-if="error" class="reset__error">{{ error }}</p>

      <AppButton type="submit" :disabled="loading">
        {{ loading ? $t('resetPassword.saving') : $t('resetPassword.submit') }}
      </AppButton>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t }    = useI18n()
const supabase = useSupabaseClient()

const password = ref('')
const confirm  = ref('')
const loading  = ref(false)
const error    = ref('')
const done     = ref(false)

async function submit() {
  error.value = ''

  if (password.value !== confirm.value) {
    error.value = t('resetPassword.errorMismatch')
    return
  }

  loading.value = true
  const { error: err } = await supabase.auth.updateUser({ password: password.value })
  loading.value = false

  if (err) {
    error.value = t('resetPassword.error')
  } else {
    done.value = true
  }
}
</script>

<style scoped lang="scss">
.reset {
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

  &__done {
    text-align: center;
    padding: 24px;
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-weight: 500;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  &__done-sub {
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--color-text-secondary);
  }

  &__link {
    margin-top: 8px;
    font-size: 0.875rem;
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 500;
    &:hover { text-decoration: underline; }
  }
}
</style>
