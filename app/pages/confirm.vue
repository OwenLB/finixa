<template>
  <div class="confirm">
    <div v-if="error" class="confirm__error">
      <p class="confirm__error-title">{{ $t('confirm.errorTitle') }}</p>
      <p class="confirm__error-sub">{{ $t('confirm.errorSub') }}</p>
      <NuxtLink to="/login" class="confirm__link">{{ $t('confirm.backToLogin') }}</NuxtLink>
    </div>

    <div v-else class="confirm__loading">
      <div class="confirm__spinner" />
      <p>{{ $t('confirm.loading') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const router = useRouter()
const route  = useRoute()
const supabase = useSupabaseClient()

const error = ref(false)

async function redirectAfterAuth(userId: string) {
  const { data, error: prefErr } = await supabase
    .from('user_preferences')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .maybeSingle()
  // Onboarding uniquement si explicitement non terminé (sans erreur de lecture) ;
  // sinon accueil — app.vue redirigera proprement si vraiment nécessaire.
  await router.replace(!prefErr && data?.onboarding_completed === false ? '/onboarding' : '/')
}

onMounted(async () => {
  // Approche token_hash : utilisée quand le lien email contient
  // ?token_hash=xxx&type=recovery (pas de PKCE, fonctionne cross-browser)
  const tokenHash = route.query.token_hash as string | undefined
  const tokenType = route.query.type as string | undefined

  if (tokenHash && tokenType) {
    const { data, error: err } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType as 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink' | 'email_change',
    })
    if (err || !data.session) {
      error.value = true
      return
    }
    if (tokenType === 'recovery') {
      await router.replace('/reset-password')
    } else {
      await redirectAfterAuth(data.session.user.id)
    }
    return
  }

  // Approche PKCE (code dans l'URL) : géré par @nuxtjs/supabase
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      await router.replace('/reset-password')
      return
    }
    if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      await redirectAfterAuth(session.user.id)
    }
  })
  onUnmounted(() => subscription.unsubscribe())

  setTimeout(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) error.value = true
    })
  }, 8000)
})
</script>

<style scoped lang="scss">
.confirm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: var(--color-text-primary);

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  &__spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 24px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    max-width: 320px;
  }

  &__error-title {
    font-weight: 600;
    font-size: 1rem;
  }

  &__error-sub {
    font-size: 0.875rem;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
