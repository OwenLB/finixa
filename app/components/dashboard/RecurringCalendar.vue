<template>
  <div class="rcal">
    <div class="rcal__head">
      <span v-for="(d, i) in dayLabels" :key="i">{{ d }}</span>
    </div>
    <div class="rcal__body">
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="rcal__cell"
        :class="{ 'is-today': cell.isToday, 'is-filler': !cell.day }"
      >
        <span v-if="cell.day" class="rcal__num">{{ cell.day }}</span>
        <div v-if="cell.items.length" class="rcal__dots">
          <span
            v-for="(it, i) in cell.items.slice(0, 3)"
            :key="i"
            class="rcal__dot"
            :style="{ background: it.color }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  cells: Array<{
    key:     string
    day:     number | null
    isToday: boolean
    items:   { color: string }[]
  }>
  dayLabels: string[]
}>()
</script>

<style scoped lang="scss">
.rcal {
  &__head {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 2px;

    span {
      text-align: center;
      font-size: 0.625rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      padding: 2px 0 6px;
    }
  }

  &__body {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  &__cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 2px;
    border-radius: var(--radius-sm);
    min-height: 38px;

    &.is-filler { pointer-events: none; }

    &.is-today {
      background: var(--color-bg-elevated);

      .rcal__num {
        color: var(--color-accent);
        font-weight: 700;
      }
    }
  }

  &__num {
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    line-height: 1.2;
  }

  &__dots {
    display: flex;
    gap: 2px;
    margin-top: 3px;
    justify-content: center;
  }

  &__dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
  }
}
</style>
