<template>
  <!-- Suggestion auto ou catégorie choisie manuellement -->
  <button
    v-if="suggestion"
    class="cat-sugg cat-sugg--filled"
    @pointerdown.stop
    @click.stop="$emit('pick')"
  >
    <div class="cat-sugg__icon" :style="{ background: icon.iconBg }">
      <component :is="icon.icon" :size="15" :color="icon.iconColor" />
    </div>

    <div class="cat-sugg__info">
      <span class="cat-sugg__name">{{ displayCategory }}</span>
      <span class="cat-sugg__type">{{ $t(`types.${suggestion.type}`) }}</span>
    </div>

    <div
      class="cat-sugg__badge"
      :style="{ background: icon.iconBg, color: icon.iconColor }"
    >
      <Sparkles :size="10" />
      <span>{{ $t('categorization.suggestion.label') }}</span>
    </div>

    <ChevronRight :size="14" class="cat-sugg__chevron" />
  </button>

  <!-- Aucune suggestion : invite à choisir -->
  <button
    v-else
    class="cat-sugg cat-sugg--empty"
    @pointerdown.stop
    @click.stop="$emit('pick')"
  >
    <Tag :size="16" class="cat-sugg__empty-icon" />
    <span>{{ $t('categorization.suggestion.pick') }}</span>
    <ChevronRight :size="14" class="cat-sugg__chevron" />
  </button>
</template>

<script setup lang="ts">
import { Sparkles, Tag, ChevronRight } from 'lucide-vue-next'
import { getCategoryIcon } from '~/utils/categoryIcon'
import { useCategoryStore } from '~/stores/useCategoryStore'
import type { LocalSuggestion } from '~/composables/useLocalSuggestion'

const props = defineProps<{
  suggestion: LocalSuggestion | null
}>()

defineEmits<{ pick: [] }>()

const categoryStore = useCategoryStore()

const icon = computed(() =>
  props.suggestion
    ? getCategoryIcon(props.suggestion.category, categoryStore.categories)
    : { icon: null, iconBg: '', iconColor: '' }
)

// Résout l'UUID ou le nom stocké dans suggestion.category en nom lisible
const displayCategory = computed(() => {
  if (!props.suggestion) return ''
  const cat = props.suggestion.category
  // Cherche par ID
  for (const c of categoryStore.categories) {
    const sub = c.subcategories.find(s => s.id === cat)
    if (sub) return sub.name
  }
  return cat
})
</script>

<style scoped lang="scss">
.cat-sugg {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  text-align: left;
  transition: opacity $transition-fast;

  &:active { opacity: 0.75; }

  // Suggestion ou catégorie choisie
  &--filled {
    background: var(--color-bg-elevated);
    border: 1.5px solid var(--color-border);
  }

  // Invite à choisir (pas de suggestion)
  &--empty {
    background: transparent;
    border: 1.5px dashed var(--color-border);
    color: var(--color-text-muted);
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
  }

  &__icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__type {
    font-size: 11px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  &__badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 7px;
    border-radius: 99px;
    background: var(--color-bg);
    color: var(--color-text-muted);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.03em;
    flex-shrink: 0;
  }

  &__chevron {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__empty-icon {
    color: var(--color-text-muted);
  }
}
</style>
