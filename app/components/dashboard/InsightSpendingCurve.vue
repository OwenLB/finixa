<template>
  <div class="ichart">
    <div class="ichart__header">
      <span class="ichart__title">Évolution du solde</span>
      <div class="ichart__legend">
        <span class="leg leg--cur"><span class="leg__line"/>Ce mois</span>
        <span class="leg leg--prev"><span class="leg__line"/>{{ prevLabel }}</span>
      </div>
    </div>
    <svg :viewBox="`0 0 ${VW} ${VH}`" class="ichart__svg">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="var(--color-accent)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Grid lines + Y labels -->
      <g v-for="g in gridLines" :key="g.label">
        <line
          :x1="PAD.l" :y1="g.y" :x2="VW - PAD.r" :y2="g.y"
          :class="['grid', { 'grid--zero': g.isZero }]"
        />
        <text :x="PAD.l - 5" :y="g.y" text-anchor="end" dominant-baseline="middle" class="alabel">
          {{ g.label }}
        </text>
      </g>

      <!-- M-1 line -->
      <polyline v-if="prev.length > 1" :points="prevPoints" class="line line--prev" />

      <!-- Gradient fill under current line -->
      <polygon v-if="areaPoints" :points="areaPoints" fill="url(#area-grad)" />

      <!-- Current line -->
      <polyline v-if="current.length > 1" :points="curPoints" class="line line--cur" />

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
import type { DailyPoint } from '~/composables/useInsightData'

const props = defineProps<{
  current: DailyPoint[]
  currentDays: number
  prev: DailyPoint[]
  prevDays: number
  prevLabel?: string
}>()

const VW = 340
const VH = 155
const PAD = { l: 30, t: 10, r: 8, b: 20 }
const cW = VW - PAD.l - PAD.r
const cH = VH - PAD.t - PAD.b

const yMin = computed(() => Math.min(0, ...props.current.map(p => p.y), ...props.prev.map(p => p.y)))
const yMax = computed(() => Math.max(0, ...props.current.map(p => p.y), ...props.prev.map(p => p.y), 1))
const yRange = computed(() => yMax.value - yMin.value)

function yOf(v: number): number {
  return PAD.t + cH * (1 - (v - yMin.value) / yRange.value)
}

function xOf(dayX: number, totalDays: number): number {
  return PAD.l + (totalDays > 1 ? dayX / (totalDays - 1) : 0) * cW
}

function toPoints(data: DailyPoint[], totalDays: number): string {
  return data.map(p => `${xOf(p.x, totalDays).toFixed(1)},${yOf(p.y).toFixed(1)}`).join(' ')
}

const curPoints  = computed(() => toPoints(props.current, props.currentDays))
const prevPoints = computed(() => toPoints(props.prev, props.prevDays))

const areaPoints = computed(() => {
  if (props.current.length < 2) return ''
  const n = props.currentDays
  const x0 = xOf(props.current[0].x, n).toFixed(1)
  const xN = xOf(props.current[props.current.length - 1].x, n).toFixed(1)
  const yB = (PAD.t + cH).toFixed(1)
  return `${curPoints.value} ${xN},${yB} ${x0},${yB}`
})

function fmtY(v: number): string {
  if (v === 0) return '0'
  const abs = Math.abs(v)
  const s = v < 0 ? '-' : ''
  if (abs >= 1000) return `${s}${+(abs / 1000).toFixed(1)}k`
  return `${s}${Math.round(abs)}`
}

const gridLines = computed(() => {
  const mn = yMin.value, mx = yMax.value
  const values = mn < 0 ? [mn, 0, mx] : [0, mx / 2, mx]
  return values.map(v => ({ y: yOf(v), label: fmtY(v), isZero: v === 0 }))
})

const xTicks = computed(() => {
  const n = props.currentDays
  if (!n) return []
  const days = new Set([1])
  ;[10, 20].forEach(d => { if (d < n) days.add(d) })
  days.add(n)
  return [...days].map(d => ({ day: d, x: xOf(d - 1, n) }))
})
</script>

<style scoped lang="scss">
.ichart {
  background: var(--color-bg-surface);
  border-radius: 12px;
  margin: 0 $page-padding-x;
  padding: 16px 0 12px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 0 12px;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__legend {
    display: flex;
    gap: 12px;
  }

  &__svg {
    width: 100%;
    overflow: visible;
  }
}

.leg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: var(--color-text-secondary);

  &__line {
    width: 14px;
    height: 2px;
    border-radius: 1px;
  }

  &--cur .leg__line { background: var(--color-accent); }
  &--prev .leg__line {
    background: var(--color-text-secondary);
    opacity: 0.45;
  }
}

.grid {
  stroke: var(--color-border-subtle);
  stroke-width: 0.8;

  &--zero {
    stroke: var(--color-text-secondary);
    opacity: 0.4;
    stroke-width: 1;
  }
}

.alabel {
  font-size: 8.5px;
  fill: var(--color-text-secondary);
}

.line {
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;

  &--cur  { stroke: var(--color-accent); }
  &--prev {
    stroke: var(--color-text-secondary);
    opacity: 0.4;
    stroke-dasharray: 4 3;
  }
}
</style>
