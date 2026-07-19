<template>
  <div class="donut">
    <svg viewBox="0 0 100 100" class="donut__svg">
      <!-- Track -->
      <circle class="donut__track" cx="50" cy="50" :r="R" fill="none" :stroke-width="SW" />
      <!-- Segments -->
      <circle
        v-for="(seg, i) in computedSegments"
        :key="i"
        cx="50" cy="50" :r="R"
        fill="none"
        :stroke="seg.color"
        :stroke-width="SW"
        :stroke-linecap="computedSegments.length === 1 ? 'butt' : 'butt'"
        :stroke-dasharray="`${seg.length} ${circumference}`"
        :stroke-dashoffset="seg.offset"
        transform="rotate(-90 50 50)"
        class="donut__seg"
      />
    </svg>
    <div class="donut__center">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface DonutSegment {
  color: string
  value: number
}

const props = defineProps<{
  segments: DonutSegment[]
  total:    number
}>()

const R   = 36
const SW  = 14
const GAP = 1.5

const circumference = 2 * Math.PI * R

const computedSegments = computed(() => {
  if (!props.total) return []
  let cum = 0
  return props.segments
    .filter(s => s.value > 0)
    .map(seg => {
      const full = (seg.value / props.total) * circumference
      const len  = Math.max(0, full - GAP)
      const offset = -cum
      cum += full
      return { color: seg.color, length: len, offset }
    })
})
</script>

<style scoped lang="scss">
.donut {
  position: relative;
  width: 180px;
  height: 180px;

  &__svg {
    width: 100%;
    height: 100%;
  }

  &__track {
    stroke: var(--color-bg-elevated);
  }

  &__seg {
    transition: stroke-dasharray 400ms ease, stroke-dashoffset 400ms ease;
  }

  &__center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
}
</style>
