<template>
  <!-- Phase 1 : choix du profil -->
  <OnboardingStepLayout
    v-if="mode === 'pick'"
    :title="$t('onboarding.template.title')"
    :subtitle="$t('onboarding.template.subtitle')"
  >
    <div class="cards">
      <button
        v-for="tpl in pickableTemplates"
        :key="tpl.id"
        class="card"
        :disabled="creating"
        @click="pickProfile(tpl.id)"
      >
        <div class="card__icon" :style="{ background: tpl.color + '22', color: tpl.color }">
          <component :is="getIcon(tpl.iconKey)" :size="18" />
        </div>
        <span class="card__label">{{ tpl.label }}</span>
        <span class="card__desc">{{ tpl.description }}</span>
        <span v-if="creating && pendingId === tpl.id" class="card__spinner" />
      </button>
    </div>

    <button class="scratch" :disabled="creating" @click="pickProfile('custom')">
      {{ $t('onboarding.template.fromScratch') }}
    </button>
  </OnboardingStepLayout>

  <!-- Phase 2 : revue / édition avec les vrais composants -->
  <div v-else class="pedit">
    <div class="pedit__head">
      <div class="pedit__titles">
        <h2 class="pedit__title">{{ $t('onboarding.template.editTitle') }}</h2>
        <p class="pedit__sub">{{ $t('onboarding.template.editSubtitle') }}</p>
      </div>
      <button class="pedit__change" :disabled="creating" @click="changeProfile">
        <RefreshCw :size="13" />
        {{ $t('onboarding.template.change') }}
      </button>
    </div>

    <div class="pedit__sections">
      <CategoriesCategorySection type="revenu" />
      <CategoriesCategorySection type="depense" />
      <CategoriesCategorySection type="epargne" />
    </div>

    <div class="pedit__actions">
      <AppButton @click="$emit('next')">{{ $t('onboarding.template.next') }}</AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { TEMPLATES, buildOnboardingDraft } from '~/data/onboarding-templates'
import { getIcon } from '~/utils/iconRegistry'
import { useCategoryStore } from '~/stores/useCategoryStore'

const props = defineProps<{ income: number | null }>()
defineEmits<{ next: [] }>()

const store = useCategoryStore()

const pickableTemplates = computed(() => TEMPLATES.filter(t => t.id !== 'custom'))

// On reprend directement en édition si des catégories existent déjà (reload).
const mode      = ref<'pick' | 'edit'>(store.categories.length > 0 ? 'edit' : 'pick')
const creating  = ref(false)
const pendingId = ref<string | null>(null)

async function pickProfile(id: string) {
  if (creating.value) return
  creating.value  = true
  pendingId.value = id
  try {
    await store.createFromTemplate(buildOnboardingDraft(id, props.income))
    mode.value = 'edit'
  } finally {
    creating.value  = false
    pendingId.value = null
  }
}

async function changeProfile() {
  creating.value = true
  try {
    await store.clearAll()
    mode.value = 'pick'
  } finally {
    creating.value = false
  }
}
</script>

<style scoped lang="scss">
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px;
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  text-align: left;
  transition: border-color $transition-fast, background $transition-fast;

  &:active { border-color: var(--color-accent); }
  &:disabled { opacity: 0.6; }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-bottom: 4px;
  }

  &__label { font-size: 0.9rem; font-weight: 600; color: var(--color-text-primary); }
  &__desc  { font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.4; }

  &__spinner {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    animation: spin 0.7s linear infinite;
  }
}

@keyframes spin { to { transform: rotate(360deg); } }

.scratch {
  align-self: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  padding: 8px;
  text-decoration: underline;
  transition: color $transition-fast;
  &:active { color: var(--color-text-secondary); }
  &:disabled { opacity: 0.5; }
}

.pedit {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 0 calc(32px + env(safe-area-inset-bottom));
  overflow-y: auto;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 0 $page-padding-x;
  }

  &__title {
    font-family: var(--font-title);
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  &__sub {
    margin-top: 6px;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__change {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 7px 10px;
    transition: color $transition-fast;
    &:active { color: var(--color-text-primary); }
    &:disabled { opacity: 0.5; }
  }

  &__sections {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  &__actions {
    margin-top: auto;
    padding: 0 $page-padding-x;
  }
}
</style>
