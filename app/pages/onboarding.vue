<template>
  <div class="ob">
    <OnboardingStepper
      v-if="step >= 1 && step <= 4"
      :step="step"
      :show-back="step > 1 && step !== 3"
      @back="step--"
    >
      <template #action>
        <button class="ob__later" :disabled="committing" @click="configureLater">
          {{ $t('onboarding.laterCta') }}
        </button>
      </template>
    </OnboardingStepper>

    <OnboardingStepBases
      v-if="step === 1"
      v-model="income"
      :user-name="userName"
      @next="step = 2"
      @skip="income = null; step = 2"
    />

    <OnboardingStepProfile
      v-else-if="step === 2"
      :income="income"
      @next="step = 3"
    />

    <OnboardingStepRecurring
      v-else-if="step === 3"
      :presets="presets"
      :loading="committing"
      :error="error"
      @commit="commitRecurring"
    />

    <OnboardingStepPeriod
      v-else-if="step === 4"
      :start-day="prefsStore.periodStartDay"
      :loading="committing"
      :error="error"
      @commit="commitPeriod"
    />

    <OnboardingStepSuccess
      v-else-if="step === 5"
      :cat-count="catCount"
      :recurring-count="recurringCount"
      @add="finishOnboarding('/add')"
      @dashboard="finishOnboarding('/')"
      @import="finishOnboarding('/more?import=1')"
    />
  </div>
</template>

<script setup lang="ts">
import type { RecurringPreset } from '~/components/onboarding/StepRecurring.vue'
import { buildRecurringForm, type RecurringDraft } from '~/utils/onboarding'

definePageMeta({ layout: 'onboarding' })

const { t } = useI18n()

const user             = useSupabaseUser()
const prefsStore       = usePreferencesStore()
const categoryStore    = useCategoryStore()
const recurringStore   = useRecurringStore()
const transactionStore = useTransactionStore()
const statsStore       = useCategoryStatsStore()
const envelopeStore    = useEnvelopeStore()
const savingsGoalStore = useSavingsGoalStore()

const DRAFT_KEY = 'finixa-onboarding'

const step           = ref(1)
const income         = ref<number | null>(null)
const committing     = ref(false)
const error          = ref('')
const recurringCount = ref(0)

const userName = computed(() =>
  (user.value?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? '',
)

const catCount = computed(() => categoryStore.categories.length)

/** Sous-catégories pré-remplies à l'étape Récurrences, liées par ID. */
const presets = computed<RecurringPreset[]>(() => {
  const out: RecurringPreset[] = []
  const findSub = (name: string) => {
    for (const cat of categoryStore.categories) {
      const sub = cat.subcategories.find(s => s.name === name)
      if (sub) return sub
    }
    return null
  }

  const salary = findSub('Salaire')
  if (salary) {
    out.push({ label: 'Salaire', amount: income.value ?? salary.budget ?? 0, type: 'revenu', day: 25, subcategoryId: salary.id })
  }
  const loyer = findSub('Loyer')
  if (loyer) {
    out.push({ label: 'Loyer', amount: loyer.budget ?? 0, type: 'depense', day: 1, subcategoryId: loyer.id })
  }
  return out
})

// --- Persistance du brouillon (un reload ne renvoie plus à zéro) ---
function saveDraft() {
  if (!import.meta.client) return
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step: step.value, income: income.value }))
}

function clearDraft() {
  if (import.meta.client) sessionStorage.removeItem(DRAFT_KEY)
}

watch([step, income], saveDraft)

onMounted(async () => {
  const raw = sessionStorage.getItem(DRAFT_KEY)
  if (!raw) return
  try {
    const saved = JSON.parse(raw) as { step?: number; income?: number | null }
    // À partir des catégories, on a besoin du store catégories chargé (presets,
    // reprise de l'édition) ; app.vue ne l'a pas chargé avant la redirection.
    if ((saved.step ?? 1) >= 2) await categoryStore.fetch()
    income.value = saved.income ?? null
    step.value   = Math.min(Math.max(saved.step ?? 1, 1), 5)
  } catch {
    clearDraft()
  }
})

// --- Transitions d'étapes ---
async function commitRecurring(items: RecurringDraft[]) {
  committing.value = true
  error.value      = ''
  try {
    const today = new Date()
    for (const item of items) {
      await recurringStore.add(buildRecurringForm(item, categoryStore.categories, today))
    }
    recurringCount.value = items.length
    step.value = 4
  } catch {
    error.value = t('onboarding.errors.recurring')
  } finally {
    committing.value = false
  }
}

async function commitPeriod(day: number) {
  committing.value = true
  error.value      = ''
  try {
    await prefsStore.setPeriodStartDay(day)
    await prefsStore.completeOnboarding()
    step.value = 5
  } catch {
    error.value = t('onboarding.errors.generic')
  } finally {
    committing.value = false
  }
}

async function configureLater() {
  committing.value = true
  error.value      = ''
  try {
    await prefsStore.completeOnboarding()
    await finishOnboarding('/')
  } catch {
    error.value = t('onboarding.errors.generic')
  } finally {
    committing.value = false
  }
}

/**
 * À la fin de l'onboarding, `app.vue` n'a pas chargé les stores de données
 * (son watch a redirigé vers /onboarding avant le fetch, et ne se redéclenche
 * pas pour le même utilisateur). On les charge ici avant de quitter, sinon
 * l'écran de destination s'afficherait vide jusqu'à un reload.
 */
async function finishOnboarding(target: string) {
  clearDraft()
  await Promise.all([
    transactionStore.fetch(),
    statsStore.fetchMonth(),
    envelopeStore.fetch(),
    savingsGoalStore.fetch(),
  ])
  navigateTo(target)
}
</script>

<style scoped lang="scss">
.ob {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;

  &__later {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    background: none;
    border: none;
    padding: 4px;
    white-space: nowrap;
    transition: color $transition-fast;
    &:active { color: var(--color-text-secondary); }
    &:disabled { opacity: 0.5; }
  }
}
</style>
