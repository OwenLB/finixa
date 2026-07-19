<template>
  <svg viewBox="0 0 180 130" class="gauge" :class="{ 'gauge--instant': instant }">
    <!-- Track -->
    <circle
      cx="90" cy="90"
      :r="R"
      fill="none"
      class="gauge__track"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="`${trackLength} ${gapLength}`"
      :transform="`rotate(${START_ROTATION} 90 90)`"
    />
    <!-- Arc prévisionnel (derrière, semi-transparent) -->
    <circle
      v-if="previewLength > 0"
      cx="90" cy="90"
      :r="R"
      fill="none"
      class="gauge__preview"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="`${previewLength} ${circumference}`"
      :transform="`rotate(${START_ROTATION} 90 90)`"
    />
    <!-- Arc réel (devant, solide blanc) -->
    <circle
      cx="90" cy="90"
      :r="R"
      fill="none"
      class="gauge__fill"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="`${normalLength} ${circumference}`"
      :transform="`rotate(${START_ROTATION} 90 90)`"
    />
    <!-- Excès -->
    <circle
      v-if="excessLength > 0"
      cx="90" cy="90"
      :r="R"
      fill="none"
      class="gauge__excess"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="`${excessLength} ${circumference}`"
      :transform="`rotate(${excessStartRotation} 90 90)`"
    />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{
  progress:         number   // réel (solide)
  previewProgress?: number   // prévisionnel (semi-transparent, plus avancé)
  strokeWidth?:     number
  instant?:         boolean  // désactive la transition (pour les panneaux pré-chargés)
}>()

const R              = 70
const GAUGE_ANGLE    = 240
const START_ROTATION = 150

const sw = computed(() => props.strokeWidth ?? 4)

const circumference = computed(() => 2 * Math.PI * R)
const trackLength   = computed(() => (GAUGE_ANGLE / 360) * circumference.value)
const gapLength     = computed(() => circumference.value - trackLength.value)

const normalLength = computed(() => Math.min(Math.max(props.progress, 0), 1) * trackLength.value)
const excessLength = computed(() => Math.min(Math.max(0, props.progress - 1), 1) * trackLength.value)
const excessStartRotation = computed(() =>
  START_ROTATION + ((trackLength.value - excessLength.value) / circumference.value) * 360
)

const previewLength = computed(() =>
  props.previewProgress != null
    ? Math.min(Math.max(props.previewProgress, 0), 1) * trackLength.value
    : 0
)

const strokeWidth = sw
</script>

<style scoped lang="scss">
.gauge {
  width: 100%;
  height: 100%;
  overflow: visible;

  &__track {
    stroke: var(--color-bg-elevated);
  }

  &__preview {
    stroke: var(--color-accent);
    opacity: 0.35;
    transition: stroke-dasharray $transition-base;
  }

  &__fill {
    stroke: var(--color-accent);
    transition: stroke-dasharray $transition-base;
  }

  &__excess {
    stroke: #ef4444;
    transition: stroke-dasharray $transition-base;
  }

  &--instant &__preview,
  &--instant &__fill,
  &--instant &__excess {
    transition: none;
  }
}
</style>
