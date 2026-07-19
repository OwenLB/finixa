<template>
  <div class="register">
    <div class="register__header">
      <img src="/logo.svg" alt="Finixa" class="register__logo" />
      <h1 class="register__title">Finixa</h1>
      <p class="register__subtitle">{{ $t('register.subtitle') }}</p>
    </div>

    <div v-if="pending" class="register__pending">
      <p>{{ $t('register.pendingTitle') }}</p>
      <p class="register__pending-sub">{{ $t('register.pendingSub') }}</p>
    </div>

    <form v-else class="register__form" @submit.prevent="submit">
      <AuthFormField
        id="fullname"
        v-model="fullname"
        type="text"
        autocomplete="name"
        :label="$t('register.fullname')"
        placeholder="Jean Dupont"
      />

      <AuthFormField
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="$t('register.email')"
        placeholder="email@exemple.fr"
      />

      <AuthFormField
        id="password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        :label="$t('register.password')"
        placeholder="••••••••"
      />

      <AuthFormField
        id="confirm"
        v-model="confirm"
        type="password"
        autocomplete="new-password"
        :label="$t('register.confirm')"
        placeholder="••••••••"
      />

      <p v-if="error" class="register__error">{{ error }}</p>

      <AppButton type="submit" :disabled="loading">
        {{ loading ? $t('register.creating') : $t('register.submit') }}
      </AppButton>
    </form>

    <p class="register__login">
      {{ $t('register.alreadyAccount') }}
      <NuxtLink to="/login">{{ $t('register.loginLink') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t }    = useI18n()
const supabase = useSupabaseClient()
const router   = useRouter()

const fullname = ref('')
const email    = ref('')
const password = ref('')
const confirm  = ref('')
const loading  = ref(false)
const error    = ref('')
const pending  = ref(false)

async function submit() {
  error.value = ''

  if (password.value !== confirm.value) {
    error.value = t('register.errorMismatch')
    return
  }

  loading.value = true
  const { data, error: err } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: { data: { full_name: fullname.value } },
  })
  loading.value = false

  if (err) {
    error.value = t('register.error')
  } else if (data.session) {
    await router.push('/onboarding')
  } else if (data.user && data.user.identities?.length === 0) {
    // Protection anti-énumération de Supabase : pour un email déjà inscrit,
    // signUp réussit sans session et renvoie un user au tableau `identities` vide.
    error.value = t('register.errorEmailExists')
  } else {
    // Email confirmation required
    pending.value = true
  }
}
</script>

<style scoped lang="scss">
.register {
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

  &__pending {
    text-align: center;
    padding: 24px;
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-weight: 500;
    line-height: 1.6;
  }

  &__pending-sub {
    margin-top: 8px;
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--color-text-secondary);
  }

  &__login {
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
}
</style>
