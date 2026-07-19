<template>
  <AppDrawer v-model="open" :title="isEdit ? 'Modifier la sous-catégorie' : 'Nouvelle sous-catégorie'">

    <AppLockedBanner :locked="isLocked" />

    <AppFormField label="Nom">
      <AppInput
        ref="inputRef"
        v-model="name"
        :disabled="isLocked"
        placeholder="Ex: Courses hebdomadaires"
        @keydown.enter="save"
      />
    </AppFormField>

    <div class="budget-field">
      <div class="budget-field__label">
        <span class="budget-field__label-text">Montant budgété</span>
        <button
          class="budget-field__no-budget"
          :class="{ 'budget-field__no-budget--active': noBudget }"
          :disabled="isLocked"
          @click="noBudget = !noBudget"
        >
          Sans budget
        </button>
      </div>
      <AppInput
        v-if="!noBudget"
        v-model.number="budget"
        :error="budgetError"
        :disabled="isLocked"
        type="number"
        inputmode="decimal"
        placeholder="0"
        suffix="€"
        @keydown.enter="save"
        @input="budgetError = ''"
      />
      <p v-else class="budget-field__hint">
        Les dépenses seront suivies sans limite définie.
      </p>
    </div>

    <AppFormField v-if="showEnvelope" label="Enveloppe">
      <div class="envelope-picker">
        <button
          v-for="opt in envelopeOptions"
          :key="opt.value ?? 'none'"
          class="envelope-picker__btn"
          :class="{ 'envelope-picker__btn--active': envelope === opt.value }"
          :style="envelope === opt.value && opt.value ? { borderColor: opt.color, color: opt.color } : {}"
          :disabled="isLocked"
          @click="envelope = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </AppFormField>

    <!-- Toggle exclu des calculs (ex: désépargne) -->
    <div class="scd__excluded-row">
      <div class="scd__excluded-info">
        <span class="scd__excluded-label">Exclure des calculs</span>
        <span class="scd__excluded-hint">Reste visible mais hors jauge, budget, prévisionnel et score</span>
      </div>
      <button
        class="scd__toggle"
        :class="{ 'scd__toggle--on': excluded }"
        :disabled="isLocked"
        role="switch"
        :aria-checked="excluded"
        @click="excluded = !excluded"
      >
        <span class="scd__toggle-thumb" />
      </button>
    </div>

    <AppButton :disabled="!name.trim() || isLocked" @click="save">
      {{ isEdit ? 'Enregistrer' : 'Ajouter la sous-catégorie' }}
    </AppButton>

    <AppConfirmDelete
      v-if="isEdit && !isLocked"
      ref="confirmRef"
      message="Supprimer définitivement ?"
      @confirm="remove"
    >
      Supprimer la sous-catégorie
    </AppConfirmDelete>

  </AppDrawer>
</template>

<script setup lang="ts">
import AppInput         from '~/components/AppInput.vue'
import AppConfirmDelete from '~/components/AppConfirmDelete.vue'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import { usePeriodStore }      from '~/stores/usePeriodStore'
import { usePreferencesStore } from '~/stores/usePreferencesStore'
import { isPeriodEditable }    from '~/utils/period'
import { ENVELOPE_COLORS } from '~/stores/useEnvelopeStore'
import type { SubCategory, EnvelopeKey, TransactionType } from '~/types'

const { t } = useI18n()

const props = defineProps<{
  catId:     string
  catType:   TransactionType
  typeColor: string
  sub?:      SubCategory
}>()

const open         = defineModel<boolean>({ default: false })
const store        = useCategoryStore()
const periodStore  = usePeriodStore()
const prefsStore   = usePreferencesStore()
const inputRef     = ref<InstanceType<typeof AppInput>>()
const confirmRef   = ref<InstanceType<typeof AppConfirmDelete>>()
const name         = ref('')
const budget       = ref<number>(0)
const noBudget     = ref(true)
const budgetError  = ref('')
const envelope     = ref<EnvelopeKey | null>(null)
const excluded     = ref(false)

const isEdit                 = computed(() => !!props.sub)
const isLocked               = computed(() => !isPeriodEditable(periodStore.month))
const showEnvelope           = computed(() => prefsStore.envelopeFeatureEnabled && props.catType !== 'revenu')

const envelopeOptions = computed(() => [
  { value: null,                      label: t('envelopes.unclassified'), color: '' },
  { value: 'needs'   as EnvelopeKey,  label: t('envelopes.needs'),        color: ENVELOPE_COLORS.needs   },
  { value: 'wants'   as EnvelopeKey,  label: t('envelopes.wants'),        color: ENVELOPE_COLORS.wants   },
  { value: 'savings' as EnvelopeKey,  label: t('envelopes.savings'),      color: ENVELOPE_COLORS.savings },
])

watch(open, (val) => {
  if (!val) { confirmRef.value?.reset(); return }
  name.value        = props.sub?.name     ?? ''
  noBudget.value    = props.sub ? props.sub.budget === null : true
  budget.value      = props.sub?.budget   ?? 0
  envelope.value    = props.sub?.envelope ?? null
  excluded.value    = props.sub?.excluded ?? false
  budgetError.value = ''
  nextTick(() => inputRef.value?.focus())
})

async function save() {
  if (!name.value.trim() || isLocked.value) return
  if (!noBudget.value && budget.value < 0) { budgetError.value = 'Le montant ne peut pas être négatif'; return }
  const finalBudget = noBudget.value ? null : budget.value
  if (props.sub) {
    await store.updateSubcategory(props.catId, props.sub.id, name.value, finalBudget)
    if (envelope.value !== props.sub.envelope) {
      await store.setSubcategoryEnvelope(props.catId, props.sub.id, envelope.value)
    }
    if (excluded.value !== props.sub.excluded) {
      await store.setSubcategoryExcluded(props.catId, props.sub.id, excluded.value)
    }
  } else {
    await store.addSubcategory(props.catId, name.value, finalBudget, envelope.value)
    if (excluded.value) {
      const created = store.categories.find(c => c.id === props.catId)?.subcategories.at(-1)
      if (created) await store.setSubcategoryExcluded(props.catId, created.id, true)
    }
  }
  open.value = false
}

async function remove() {
  if (!props.sub) return
  await store.deleteSubcategory(props.catId, props.sub.id)
  open.value = false
}
</script>

<style scoped lang="scss">
.budget-field {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__label {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__label-text { @include label-caps; }

  &__no-budget {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 99px;
    border: 1.5px solid var(--color-border);
    color: var(--color-text-muted);
    background: transparent;
    cursor: pointer;
    transition: border-color $transition-fast, color $transition-fast, background $transition-fast;

    &--active {
      border-color: var(--color-accent);
      color: var(--color-accent);
      background: var(--color-accent-subtle, color-mix(in srgb, var(--color-accent) 12%, transparent));
    }

    &:disabled { opacity: 0.5; cursor: default; }
  }

  &__hint {
    font-size: 12px;
    color: var(--color-text-muted);
    margin: 0;
    padding: 10px 12px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm, 8px);
  }
}

.scd {
  &__excluded-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 4px 0;
  }

  &__excluded-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__excluded-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  &__excluded-hint {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  &__toggle {
    width: 44px;
    height: 26px;
    border-radius: 13px;
    background: var(--color-border);
    flex-shrink: 0;
    position: relative;
    transition: background $transition-fast;
    cursor: pointer;

    &--on { background: var(--color-accent); }
    &:disabled { opacity: 0.4; pointer-events: none; }
  }

  &__toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: transform $transition-fast;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    .scd__toggle--on & { transform: translateX(18px); }
  }
}

.envelope-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  &__btn {
    padding: 6px 12px;
    border-radius: 99px;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg-elevated);
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color $transition-fast, color $transition-fast;

    &--active {
      background: transparent;
      font-weight: 600;
    }

    &:disabled { opacity: 0.5; cursor: default; }
  }
}
</style>
