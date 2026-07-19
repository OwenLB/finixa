<template>
  <!-- Info : Aa + dots en haut à gauche -->
  <div :class="['tp-info', `tp-info--${mode}`]">
    <span class="tp-info__aa">Aa</span>
    <div class="tp-info__dots">
      <span v-for="c in SWATCHES" :key="c" class="tp-info__dot" :style="{ background: c }" />
    </div>
  </div>

  <!-- Bento : pleine hauteur, alternance 1 col / 2 cols -->
  <div :class="['tp-bento', `tp-bento--${mode}`]">
    <div class="tp-bento__cell" />
    <div class="tp-bento__row">
      <div class="tp-bento__cell" />
      <div class="tp-bento__cell" />
    </div>
    <template v-if="!compact">
      <div class="tp-bento__cell" />
      <div class="tp-bento__row">
        <div class="tp-bento__cell" />
        <div class="tp-bento__cell" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{ mode: 'light' | 'dark'; compact?: boolean }>()

const SWATCHES = ['#818cf8', '#34d399', '#f97316', '#f472b6']
</script>

<style scoped lang="scss">
.tp-info {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 6px 0 0 6px;
  gap: 5px;

  &__aa {
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
  }

  &__dots { display: flex; gap: 3px; }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  &--light &__aa { color: #111111; }
  &--dark  &__aa { color: #f4f4f5; }
}

.tp-bento {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 5px 5px 0;

  &__row {
    flex: 1;
    display: flex;
    gap: 3px;
  }

  &__cell {
    flex: 1;
    border-radius: 2px;
    min-height: 0;
  }

  &--light &__cell { background: #e4e4e4; }
  &--dark  &__cell { background: #2a2a2a; }
}
</style>
