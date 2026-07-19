<template>
  <div>
    <Transition name="splash">
      <div v-if="showSplash" class="splash">
        <img src="/logo.svg" alt="Finixa" class="splash__logo" />
        <span class="splash__name">Finixa</span>
      </div>
    </Transition>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage :transition="pageTransition" />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const showSplash = ref(true)
// Filet de sécurité : on ne laisse jamais le splash bloqué si un fetch pend
onMounted(() => {
  setTimeout(() => { showSplash.value = false }, 3000)
})

const { initTheme }       = useTheme()
const transactionStore    = useTransactionStore()
const categoryStore       = useCategoryStore()
const categoryStatsStore  = useCategoryStatsStore()
const prefsStore          = usePreferencesStore()
const envelopeStore       = useEnvelopeStore()
const savingsGoalStore    = useSavingsGoalStore()
const currencyStore       = useCurrencyStore()
const user                = useSupabaseUser()

onMounted(async () => {
  await initTheme()
  await currencyStore.loadCurrency()
})

const route = useRoute()
let loadedUserId: string | null = null

const pageTransition = computed(() => {
  if (route.path.startsWith('/edit/')) return { name: 'slide-up' }
  return { name: 'fade' }
})

// Charge les données dès que l'utilisateur est connecté
watch(user, async (u) => {
  // Pas d'utilisateur (déconnecté / page d'auth) : rien à charger, on lève le splash
  if (!u) { showSplash.value = false; return }
  // Ne recharger que si c'est un nouvel utilisateur (évite les boucles sur TOKEN_REFRESHED)
  if (u.id === loadedUserId) return
  loadedUserId = u.id
  try {
    const prefsOk = await prefsStore.fetch()
    const excluded = ['/login', '/register', '/onboarding']
    // On ne redirige vers l'onboarding QUE si la lecture des préférences a
    // réussi. En cas d'échec (réseau, JWT), onboardingCompleted n'est pas fiable
    // et renverrait à tort un utilisateur existant vers l'onboarding.
    if (prefsOk && !prefsStore.onboardingCompleted && !excluded.includes(route.path)) {
      await navigateTo('/onboarding')
      return
    }
    await Promise.all([
      transactionStore.fetch(),
      categoryStore.fetch(),
      categoryStatsStore.fetchMonth(),
      envelopeStore.fetch(),
      savingsGoalStore.fetch(),
    ])
  } finally {
    // Splash levé dès que les données sont prêtes (plus de délai fixe de 1,2 s)
    showSplash.value = false
  }
}, { immediate: true })
</script>

<style scoped lang="scss">
.splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;

  &__logo {
    width: 64px;
    height: auto;

    [data-theme='light'] & {
      filter: invert(1);
    }
  }

  &__name {
    font-family: var(--font-title);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
  }
}

.splash-leave-active {
  transition: opacity 0.4s ease;
}
.splash-leave-to {
  opacity: 0;
}

/* Fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide up */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
