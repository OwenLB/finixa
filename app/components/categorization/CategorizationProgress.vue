<template>
  <div class="cat-prog">
    <div class="cat-prog__row">
      <span class="cat-prog__label">{{ $t('categorization.progress.label') }}</span>
      <span class="cat-prog__count">
        <span class="cat-prog__count-done">{{ validated }}</span>
        <span class="cat-prog__count-sep">/</span>
        <span>{{ total }}</span>
      </span>
    </div>
    <div class="cat-prog__track" role="progressbar" :aria-valuenow="validated" :aria-valuemax="total">
      <div class="cat-prog__fill" :style="{ width: `${fillPct}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  validated: number
  total:     number
}>()

const fillPct = computed(() =>
  props.total > 0 ? Math.round((props.validated / props.total) * 100) : 0
)
</script>

<style scoped lang="scss">
.cat-prog {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__label {
    @include label-caps;
  }

  &__count {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-muted);
    display: flex;
    align-items: baseline;
    gap: 2px;
  }

  &__count-done {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__count-sep {
    margin: 0 1px;
  }

  &__track {
    height: 5px;
    background: var(--color-bg-elevated);
    border-radius: 99px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    background: var(--color-accent);
    border-radius: 99px;
    transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
  }
}
</style>
