<template>
  <MoreSection :title="t('envelopes.settings.sectionTitle')">
    <MoreSettingsRow :label="t('envelopes.settings.rowLabel')" icon-bg="#14b8a620" clickable chevron @click="drawerOpen = true">
      <template #icon><PieChart :size="16" style="color:#14b8a6" /></template>
      <span class="env__value">{{ prefsStore.envelopeFeatureEnabled ? t('envelopes.settings.enabled') : t('envelopes.settings.disabled') }}</span>
    </MoreSettingsRow>
  </MoreSection>

  <AppDrawer v-model="drawerOpen" :title="t('envelopes.settings.drawerTitle')">
    <div class="env-drawer__toggle">
      <span class="env-drawer__toggle-label">{{ t('envelopes.settings.toggleLabel') }}</span>
      <AppToggle :model-value="prefsStore.envelopeFeatureEnabled" @update:model-value="toggleFeature" />
    </div>

    <BudgetEnvelopeEditor
      v-model="pct"
      :income="income"
    />

    <div class="env-drawer__footer">
      <AppButton :loading="saving" :disabled="pct.needs + pct.wants + pct.savings !== 100" @click="save">
        {{ saving ? t('envelopes.settings.saving') : t('envelopes.settings.save') }}
      </AppButton>
    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
import { PieChart } from 'lucide-vue-next'

const { t }         = useI18n()
const prefsStore    = usePreferencesStore()
const envelopeStore = useEnvelopeStore()
const categoryStore = useCategoryStore()

const drawerOpen = ref(false)
const saving     = ref(false)

const income = computed(() => categoryStore.budgetTotals.get('revenu') ?? 0)

const pct = ref({
  needs:   envelopeStore.needsPct,
  wants:   envelopeStore.wantsPct,
  savings: envelopeStore.savingsPct,
})

watch(drawerOpen, (val) => {
  if (val) {
    pct.value = {
      needs:   envelopeStore.needsPct,
      wants:   envelopeStore.wantsPct,
      savings: envelopeStore.savingsPct,
    }
  }
})

async function save() {
  saving.value = true
  try {
    await envelopeStore.save({
      needsPct:   pct.value.needs,
      wantsPct:   pct.value.wants,
      savingsPct: pct.value.savings,
    })
    drawerOpen.value = false
  } catch {
    // error already stored in envelopeStore.error
  } finally {
    saving.value = false
  }
}

async function toggleFeature(val: boolean) {
  if (val) {
    await prefsStore.enableEnvelopeFeature()
  } else {
    await prefsStore.disableEnvelopeFeature()
  }
}
</script>

<style scoped lang="scss">
.env__value {
  font-size: 13px;
  color: var(--color-text-muted);
}

.env-drawer {
  &__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0 20px;
    border-bottom: 1px solid var(--color-border-subtle);
    margin-bottom: 4px;
  }

  &__toggle-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  &__footer {
    margin-top: 4px;
  }
}
</style>
