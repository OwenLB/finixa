<template>
  <button type="button" class="sel__trigger" :class="{ 'sel__trigger--empty': !modelValue }" @click="open = true">
    <span class="sel__value">{{ selectedLabel }}</span>
    <ChevronDown :size="13" class="sel__chevron" />
  </button>

  <AppDrawer v-model="open" :z-index="600" :title="label ?? placeholder ?? 'Choisir'">
    <ul class="sel-drawer">
      <li
        v-for="opt in options"
        :key="opt.value"
        class="sel-drawer__item"
        :class="{ 'sel-drawer__item--active': opt.value === modelValue }"
        @click="select(opt.value)"
      >
        <span class="sel-drawer__label">{{ opt.label }}</span>
        <span class="sel-drawer__radio" :class="{ 'sel-drawer__radio--checked': opt.value === modelValue }" />
      </li>
    </ul>
  </AppDrawer>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

interface Option { value: string; label: string }

const props = defineProps<{
  modelValue:   string
  options:      Option[]
  label?:       string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const open = ref(false)

const selectedLabel = computed(() =>
  props.options.find(o => o.value === props.modelValue)?.label ?? props.placeholder ?? '—'
)

function select(value: string) {
  const changed = value !== props.modelValue
  emit('update:modelValue', value)
  if (changed) emit('change', value)
  open.value = false
}
</script>

<style scoped lang="scss">
.sel {
  &__trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 10px 10px 10px 12px;
    cursor: pointer;

    &--empty .sel__value { color: var(--color-text-muted); }
  }

  &__value {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  &__chevron {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }
}

.sel-drawer {
  list-style: none;
  display: flex;
  flex-direction: column;

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 0;
    cursor: pointer;

    & + & { border-top: 1px solid var(--color-border-subtle); }

    &--active .sel-drawer__label { color: var(--color-text-primary); font-weight: 600; }
  }

  &__label {
    font-size: 15px;
    font-weight: 400;
    color: var(--color-text-secondary);
  }

  &__radio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    flex-shrink: 0;
    transition: border-color $transition-fast, background $transition-fast;

    &--checked {
      border-color: var(--color-accent);
      background: var(--color-accent);
      box-shadow: inset 0 0 0 4px var(--color-bg-elevated);
    }
  }
}
</style>
