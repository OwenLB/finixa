<template>
  <div class="tx-form">

    <FormAmountInput :model-value="form.amount" @update:model-value="form.amount = $event" />

    <div class="tx-form__fields">

      <AppFormField :label="t('form.label')">
        <div class="tx-form__label-row">
          <input
            v-model="form.label"
            class="tx-form__input"
            type="text"
            :placeholder="t('form.labelPlaceholder')"
            @input="onLabelInput()"
          />
          <button type="button" class="tx-form__fav-btn" :aria-label="$t('a11y.openFavorites')" @click="$emit('openFavorites')">
            <Zap :size="18" />
          </button>
        </div>
      </AppFormField>

      <FavoritesSuggestions :label="form.label" @apply="onFavoriteSelect" />
      <FormLabelSuggestion :suggestions="labelSuggestions" @select="onSuggestionSelect" />

      <FormCategorySelector
        ref="categorySelectorRef"
        v-model:type="form.type"
        v-model:category="form.category"
        v-model:category-id="form.categoryId"
        v-model:subcategory="form.subcategory"
        v-model:subcategory-id="form.subcategoryId"
      />

      <!-- Dates côte à côte -->
      <!-- Non-récurrent : date | date comptable -->
      <div v-if="!form.recurring && !recurringOnly" class="tx-form__date-row">
        <FormDateField
          v-model="form.date"
          :label="t('form.date')"
          :formatted-value="formattedDate"
        />
        <FormDateField
          v-model="form.accountingDate"
          :label="t('form.accountingDate')"
          :formatted-value="formattedAccountingDate"
          :muted="!form.accountingDate"
        />
      </div>

      <!-- Récurrent : date début | date fin -->
      <div v-else class="tx-form__date-row">
        <FormDateField
          v-model="form.date"
          :label="t('form.startDate')"
          :formatted-value="formattedDate"
        />
        <FormDateField
          v-model="form.recurringEndDate"
          :label="t('form.recurringEndDate')"
          :formatted-value="form.recurringEndDate ? formattedEndDate : t('form.recurringEndDatePlaceholder')"
          :muted="!form.recurringEndDate"
        />
      </div>

      <!-- Section Options : récurrence + note + hors budget -->
      <div class="tx-form__options">
        <button
          v-if="!recurringOnly"
          type="button"
          class="tx-form__options-toggle"
          :class="{ 'tx-form__options-toggle--open': optionsOpen }"
          @click="optionsOpen = !optionsOpen"
        >
          {{ t('form.options') }}
          <template v-if="!optionsOpen">
            <span
              v-for="tag in optionsTags"
              :key="tag.label"
              class="tx-form__options-tag"
              :class="{ 'tx-form__options-tag--active': tag.active }"
            >{{ tag.label }}</span>
          </template>
          <ChevronDown :size="15" class="tx-form__options-chevron" />
        </button>

        <Transition name="tx-form__options-expand">
          <div v-if="optionsOpen || recurringOnly" class="tx-form__options-body">

            <!-- Toggle récurrence (mode normal, non-édition) -->
            <AppFormField v-if="!recurringOnly && !isEditing" :label="t('form.recurring')">
              <div class="tx-form__recurring-row">
                <AppToggle v-model="form.recurring" />
                <Transition name="tx-form__freq">
                  <FormSelectInput
                    v-if="form.recurring"
                    v-model="form.frequency"
                    :label="t('form.frequency')"
                    :options="frequencyOptions"
                    class="tx-form__freq-select"
                  />
                </Transition>
                <span v-if="!form.recurring" class="tx-form__hors-budget-hint">{{ t('form.recurringHint') }}</span>
              </div>
            </AppFormField>

            <!-- Mode récurrence seule : fréquence toujours visible -->
            <AppFormField v-if="recurringOnly" :label="t('form.frequency')">
              <FormSelectInput v-model="form.frequency" :label="t('form.frequency')" :options="frequencyOptions" />
            </AppFormField>

            <!-- Décalage comptable -->
            <AppFormField v-if="form.recurring || recurringOnly" :label="t('form.accountingOffset')">
              <FormSelectInput
                v-model="form.accountingOffset"
                :label="t('form.accountingOffset')"
                :options="accountingOffsetOptions"
              />
            </AppFormField>

            <!-- Note -->
            <AppFormField :label="t('form.note')">
              <textarea
                v-model="form.note"
                class="tx-form__textarea"
                :placeholder="t('form.notePlaceholder')"
                rows="3"
              />
            </AppFormField>

            <!-- Hors budget — disponible pour tout type (sauf récurrents) -->
            <AppFormField
              v-if="!form.recurring && !recurringOnly"
              :label="t('form.horsBudget')"
            >
              <div class="tx-form__recurring-row">
                <AppToggle v-model="form.horsBudget" />
                <span class="tx-form__hors-budget-hint">{{ t('form.horsBudgetHint') }}</span>
              </div>
            </AppFormField>

          </div>
        </Transition>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { Zap, ChevronDown } from 'lucide-vue-next'
import { useCategoryStore } from '~/stores/useCategoryStore'
import { useLabelSuggestions } from '~/composables/useLabelSuggestions'
import type { TransactionForm as TxForm, Favorite } from '~/types'
import type { LabelSuggestion } from '~/services/predictionService'
import { todayLocalISO } from '~/utils/localDate'

const props = defineProps<{ form: TxForm; recurringOnly?: boolean; isEditing?: boolean }>()
defineEmits<{ openFavorites: [] }>()


const optionsOpen = ref(!!(props.form.note || props.form.horsBudget || props.form.recurring || props.recurringOnly))

watch(() => props.form.recurring, (recurring) => {
  if (recurring) props.form.horsBudget = false
})

const optionsTags = computed(() => {
  const tags: { label: string; active: boolean }[] = []

  if (!props.recurringOnly && !props.isEditing) {
    const freq = frequencyOptions.value.find(f => f.value === props.form.frequency)
    tags.push({
      label:  props.form.recurring && freq ? freq.label : t('form.recurring'),
      active: props.form.recurring,
    })
  }

  tags.push({ label: t('form.note'),       active: !!props.form.note?.trim() })

  if (!props.form.recurring && !props.recurringOnly)
    tags.push({ label: t('form.horsBudget'), active: props.form.horsBudget })

  return tags
})

const { t, locale }       = useI18n()
const categorySelectorRef = ref<{ reset: () => void }>()
const categoryStore       = useCategoryStore()

// ── Suggestions de catégorie par intitulé ─────────────────────────────────────
const { suggestions: labelSuggestions, onInput: onLabelInput, clear: clearSuggestions } = useLabelSuggestions(props.form)

function onFavoriteSelect(fav: Favorite) {
  props.form.label       = fav.name
  props.form.amount      = Math.abs(fav.amount)
  props.form.type        = fav.type
  props.form.category    = fav.category
  props.form.subcategory = fav.subcategory
  const cat = categoryStore.byType(fav.type).find(c => c.name === fav.category)
  props.form.categoryId    = cat?.id ?? ''
  props.form.subcategoryId = cat?.subcategories.find(s => s.name === fav.subcategory)?.id ?? ''
  clearSuggestions()
}

function onSuggestionSelect(s: LabelSuggestion) {
  props.form.label = s.label
  props.form.type  = s.type
  // s.category peut être un nom ou un UUID selon l'état des données
  const parent = categoryStore.byType(s.type).find(c =>
    c.subcategories.some(sub => sub.name === s.category || sub.id === s.category)
  )
  if (parent) {
    const sub = parent.subcategories.find(sub => sub.name === s.category || sub.id === s.category)!
    props.form.category      = parent.name
    props.form.categoryId    = parent.id
    props.form.subcategory   = sub.name
    props.form.subcategoryId = sub.id
  } else {
    props.form.category      = s.category
    props.form.categoryId    = ''
    props.form.subcategory   = ''
    props.form.subcategoryId = ''
  }
  clearSuggestions()
}

const today = todayLocalISO()

const frequencyOptions = computed(() => [
  { value: 'monthly',   label: t('form.frequencyMonthly')   },
  { value: 'weekly',    label: t('form.frequencyWeekly')    },
  { value: 'quarterly', label: t('form.frequencyQuarterly') },
  { value: 'yearly',    label: t('form.frequencyYearly')    },
])

const accountingOffsetOptions = computed(() => [
  { value: 'same_month', label: t('form.accountingOffsetSameMonth') },
  { value: 'next_month', label: t('form.accountingOffsetNextMonth') },
])

const formattedDate = computed(() => {
  const d = new Date(props.form.date + 'T12:00:00')
  if (props.form.date === today) {
    return t('form.today', { date: d.toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }) })
  }
  return d.toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

const formattedEndDate = computed(() => {
  if (!props.form.recurringEndDate) return ''
  const d = new Date(props.form.recurringEndDate + 'T12:00:00')
  return d.toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' })
})

const formattedAccountingDate = computed(() => {
  if (!props.form.accountingDate) return t('form.accountingDatePlaceholder')
  const d = new Date(props.form.accountingDate + 'T12:00:00')
  return d.toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' })
})

function resetSearch() {
  categorySelectorRef.value?.reset()
  clearSuggestions()
}

defineExpose({ resetSearch })
</script>

<style scoped lang="scss">
.tx-form {
  display: contents;

  &__fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 0 $page-padding-x;
  }

  &__label-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__fav-btn {
    @include btn-icon(42px);
    flex-shrink: 0;
    // Tokens accent (s'adaptent au thème) — avant : #fff/#111 figés, invisibles
    // sur fond clair en thème light (U3)
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border-radius: var(--radius-md);
  }

  &__input {
    width: 100%;
    flex: 1;
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

  &__recurring-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__freq-select {
    flex: 1;
  }

  &__freq-enter-active,
  &__freq-leave-active { transition: opacity $transition-fast, transform $transition-fast; }
  &__freq-enter-from,
  &__freq-leave-to     { opacity: 0; transform: translateX(-6px); }

  &__date-row {
    display: flex;
    gap: 10px;

    > * { flex: 1; min-width: 0; }
  }

  &__textarea {
    width: 100%;
    background: var(--color-bg-elevated);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 13px 14px;
    font-size: 14px;
    color: var(--color-text-primary);
    font-family: inherit;
    resize: none;
    outline: none;
    transition: border-color $transition-fast;
    line-height: 1.5;

    &::placeholder { color: var(--color-text-muted); }
    &:focus { border-color: var(--color-accent); }
  }

  &__options {
    display: flex;
    flex-direction: column;
  }

  &__options-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    align-self: flex-start;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 0;

    &:active { opacity: 0.6; }
  }

  &__options-tag {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted);
    opacity: 0.45;

    &::before { content: '·'; margin-right: 6px; }

    &--active {
      opacity: 1;
      color: var(--color-accent);
    }
  }

  &__options-chevron {
    transition: transform $transition-fast;
  }

  &__options-toggle--open &__options-chevron {
    transform: rotate(180deg);
  }

  &__options-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-top: 20px;
  }

  &__options-expand-enter-active { transition: opacity $transition-fast, transform $transition-fast; }
  &__options-expand-enter-from   { opacity: 0; transform: translateY(-6px); }

  &__hors-budget-hint {
    font-size: 12px;
    color: var(--color-text-muted);
    line-height: 1.4;
  }

}
</style>
