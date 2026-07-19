<template>
  <div class="step">
    <div class="step__head">
      <h2 class="step__title">Ajoute ta première transaction</h2>
      <p class="step__sub">Pour commencer à suivre tes finances dès maintenant.</p>
    </div>

    <!-- Montant — FormAmountInput gère son propre padding horizontal -->
    <FormAmountInput :model-value="form.amount" @update:model-value="form.amount = $event" />

    <div class="step__fields">
      <!-- Intitulé -->
      <AppFormField :label="$t('form.label')">
        <input
          v-model="form.label"
          class="step__input"
          type="text"
          :placeholder="$t('form.labelPlaceholder')"
        />
      </AppFormField>

      <!-- Date -->
      <AppFormField :label="$t('form.date')">
        <label class="step__date">
          <span class="step__date-text">{{ formattedDate }}</span>
          <CalendarDays :size="18" class="step__date-icon" />
          <input v-model="form.date" class="step__date-native" type="date" />
        </label>
      </AppFormField>

      <!-- Type / Catégorie / Sous-catégorie -->
      <div class="step__dropdowns">
        <div class="step__dropdown-group">
          <span class="step__dropdown-label">{{ $t('form.type') }}</span>
          <FormSelectInput
            v-model="form.type"
            :label="$t('form.type')"
            :options="typeOptions"
            @change="onTypeChange"
          />
        </div>
        <div class="step__dropdown-group">
          <span class="step__dropdown-label">{{ $t('form.category') }}</span>
          <FormSelectInput
            v-model="form.category"
            :label="$t('form.category')"
            :options="availableCategories"
            placeholder="—"
            @change="form.subcategory = ''"
          />
        </div>
        <div class="step__dropdown-group">
          <span class="step__dropdown-label">{{ $t('form.subcategory') }}</span>
          <FormSelectInput
            v-model="form.subcategory"
            :label="$t('form.subcategoryFull')"
            :options="availableSubcategories"
            placeholder="—"
          />
        </div>
      </div>
    </div>

    <div class="step__actions">
      <AppButton :disabled="!form.amount && !form.label.trim()" @click="$emit('next')">
        Ajouter et continuer
      </AppButton>
      <button class="step__skip" @click="$emit('skip')">Passer cette étape</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays } from 'lucide-vue-next'
import { TRANSACTION_TYPES } from '~/types'
import { useCategoryStore } from '~/stores/useCategoryStore'
import type { TransactionForm as TxForm } from '~/types'
import { todayLocalISO } from '~/utils/localDate'
const props = defineProps<{ form: TxForm }>()
defineEmits<{ next: []; skip: [] }>()

const { t, locale } = useI18n()
const categoryStore = useCategoryStore()
const today             = todayLocalISO()

const typeOptions = computed(() =>
  TRANSACTION_TYPES.map(opt => ({ value: opt.value, label: t(`types.${opt.value}`) }))
)

const formattedDate = computed(() => {
  const d = new Date(props.form.date + 'T12:00:00')
  if (props.form.date === today) {
    return t('form.today', { date: d.toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }) })
  }
  return d.toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

const availableCategories = computed(() =>
  categoryStore.byType(props.form.type).map(c => ({ value: c.name, label: c.name }))
)

const availableSubcategories = computed(() => {
  if (!props.form.category) return []
  const cat = categoryStore.byType(props.form.type).find(c => c.name === props.form.category)
  return cat?.subcategories.map(s => ({ value: s.name, label: s.name })) ?? []
})

function onTypeChange() {
  props.form.category    = ''
  props.form.subcategory = ''
}
</script>

<style scoped lang="scss">
.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  // Pas de padding H : FormAmountInput gère le sien, step__fields gère le sien
  padding-top: 24px;
  padding-bottom: calc(32px + env(safe-area-inset-bottom));
  gap: 0;
  overflow-y: auto;

  &__head {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 $page-padding-x 24px;
  }

  &__title { font-size: 1.3rem; font-weight: 700; color: var(--color-text-primary); line-height: 1.3; }
  &__sub   { font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5; }

  // Miroir de .tx-form__fields dans TransactionForm.vue
  &__fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 0 $page-padding-x;
  }

  &__input {
    width: 100%;
    background: var(--color-bg-elevated);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 13px 14px;
    font-size: 14px;
    color: var(--color-text-primary);
    outline: none;
    transition: border-color $transition-fast;

    &::placeholder { color: var(--color-text-muted); }
    &:focus { border-color: var(--color-accent); }
  }

  &__date {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-bg-elevated);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 13px 14px;
    cursor: pointer;
    &:focus-within { border-color: var(--color-accent); }
  }

  &__date-text { font-size: 14px; color: var(--color-text-primary); text-transform: capitalize; }
  &__date-icon { color: var(--color-text-muted); }

  &__date-native {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    cursor: pointer;
  }

  &__dropdowns {
    display: flex;
    gap: 10px;
  }

  &__dropdown-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__dropdown-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  &__actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 24px $page-padding-x 0;
  }

  &__skip {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-align: center;
    padding: 8px;
    transition: color $transition-fast;
    &:hover { color: var(--color-text-secondary); }
  }
}
</style>
