<template>
  <div class="ichart">
    <div class="ichart__header">
      <span class="ichart__title">Histogramme des dépenses</span>
    </div>
    <svg :viewBox="`0 0 ${VW} ${VH}`" class="ichart__svg">
      <!-- Grid lines + Y labels -->
      <g v-for="g in gridLines" :key="g.label">
        <line :x1="PAD.l" :y1="g.y" :x2="VW - PAD.r" :y2="g.y" class="grid" />
        <text :x="PAD.l - 5" :y="g.y" text-anchor="end" dominant-baseline="middle" class="alabel">{{ g.label }}</text>
      </g>

      <!-- Bars -->
      <rect
        v-for="(amount, i) in current"
        :key="i"
        :x="barX(i)"
        :y="barY(amount)"
        :width="barW"
        :height="barH(amount)"
        class="bar"
        rx="2"
      />

      <!-- X axis labels -->
      <text
        v-for="t in xTicks"
        :key="t.day"
        :x="t.x"
        :y="VH - PAD.b + 12"
        text-anchor="middle"
        class="alabel"
      >{{ t.day }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  current: number[]
}>()

const VW = 340
const VH = 130
const PAD = { l: 30, t: 8, r: 8, b: 20 }
const cW = VW - PAD.l - PAD.r
const cH = VH - PAD.t - PAD.b

const GAP = 2

const barW = computed(() => {
  const n = props.current.length
  if (!n) return 6
  return Math.max(2, (cW - (n - 1) * GAP) / n)
})

function barX(i: number): number {
  return PAD.l + i * (barW.value + GAP)
}

const yMax = computed(() => {
  const m = Math.max(...props.current, 1)
  const exp = Math.pow(10, Math.floor(Math.log10(m)))
  return Math.ceil(m / exp) * exp
})

function barH(v: number): number {
  if (v <= 0) return 1
  return Math.max(2, (v / yMax.value) * cH)
}

function barY(v: number): number {
  return PAD.t + cH - barH(v)
}

function fmtY(v: number): string {
  if (v === 0) return '0'
  if (v >= 1000) return `${+(v / 1000).toFixed(1)}k`
  return String(Math.round(v))
}

const gridLines = computed(() =>
  [0, 0.5, 1].map(f => ({
    y:     PAD.t + cH * (1 - f),
    label: fmtY(f * yMax.value),
  }))
)

const xTicks = computed(() => {
  const n = props.current.length
  if (!n) return []
  const days = new Set([1])
  ;[10, 20].forEach(d => { if (d < n) days.add(d) })
  days.add(n)
  return [...days].map(d => ({
    day: d,
    x:   barX(d - 1) + barW.value / 2,
  }))
})
</script>

<style scoped lang="scss">
.ichart {
  background: var(--color-bg-surface);
  border-radius: 12px;
  margin: 0 $page-padding-x;
  padding: 16px 0 12px;

  &__header {
    margin-bottom: 10px;
    padding: 0 12px;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__svg {
    width: 100%;
    overflow: visible;
  }
}

.grid {
  stroke: var(--color-border-subtle);
  stroke-width: 0.8;
}

.alabel {
  font-size: 8.5px;
  fill: var(--color-text-secondary);
}

.bar {
  fill: var(--color-text-primary);
}
</style>
