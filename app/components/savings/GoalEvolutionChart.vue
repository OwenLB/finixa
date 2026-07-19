<template>
  <div class="gec">
    <div v-if="!hasData" class="gec__empty">
      {{ $t('savingsGoals.noTransactions') }}
    </div>

    <svg v-else :viewBox="`0 0 ${VW} ${VH}`" class="gec__svg">
      <defs>
        <linearGradient :id="`grad-${goal.id}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   :stop-color="goal.color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="goal.color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Grid lines Y + labels Y -->
      <g v-for="g in gridLines" :key="g.label">
        <line :x1="PAD.l" :y1="g.y" :x2="VW - PAD.r" :y2="g.y" class="gec__grid" />
        <text :x="PAD.l - 5" :y="g.y" text-anchor="end" dominant-baseline="middle" class="gec__label">
          {{ g.label }}
        </text>
      </g>

      <!-- Axe X -->
      <line :x1="PAD.l" :y1="PAD.t + cH" :x2="VW - PAD.r" :y2="PAD.t + cH" class="gec__axis" />

      <!-- Labels X (mois) -->
      <text
        v-for="tick in xTicks"
        :key="tick.label"
        :x="tick.x"
        :y="VH - PAD.b + 13"
        text-anchor="middle"
        class="gec__label"
      >
        {{ tick.label }}
      </text>

      <!-- Ligne objectif pointillée -->
      <line
        v-if="targetY !== null"
        :x1="PAD.l" :y1="targetY" :x2="VW - PAD.r" :y2="targetY"
        class="gec__target-line"
      />

      <!-- Zone remplie -->
      <path :d="areaPath" :fill="`url(#grad-${goal.id})`" />

      <!-- Courbe -->
      <polyline :points="linePoints" class="gec__line" :style="{ stroke: goal.color }" />

      <!-- Projection en pointillé -->
      <polyline
        v-if="projectionPoints"
        :points="projectionPoints"
        class="gec__projection"
        :style="{ stroke: goal.color }"
      />

      <!-- Point final -->
      <circle v-if="lastPt" :cx="lastPt.x" :cy="lastPt.y" r="3" :fill="goal.color" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { fetchSavingsGoalHistory } from '~/services/savingsGoalService'
import type { SavingsGoal } from '~/types'

const props = defineProps<{ goal: SavingsGoal; monthlyRate?: number }>()

const supabase = useSupabaseClient()

const VW  = 320
const VH  = 130
const PAD = { l: 32, t: 8, r: 8, b: 28 }
const cW  = VW - PAD.l - PAD.r
const cH  = VH - PAD.t - PAD.b

const { t } = useI18n()

const rawHistory = ref<{ date: string; cumulative: number }[]>([])

onMounted(async () => {
  rawHistory.value = await fetchSavingsGoalHistory(supabase, props.goal.id)
})

function fmtY(val: number): string {
  if (val === 0) return '0'
  if (val >= 1000) return `${Math.round(val / 1000)}k`
  return String(Math.round(val))
}

// Plage X fixe : date de création → +12 mois
const xStart = computed(() => new Date(props.goal.createdAt.slice(0, 10)).getTime())
const xEnd   = computed(() => {
  const d = new Date(props.goal.createdAt.slice(0, 10))
  d.setFullYear(d.getFullYear() + 1)
  return d.getTime()
})
const xRange = computed(() => xEnd.value - xStart.value)

function dateToX(dateStr: string): number {
  const t = new Date(dateStr).getTime()
  const clamped = Math.min(Math.max(t, xStart.value), xEnd.value)
  return PAD.l + ((clamped - xStart.value) / xRange.value) * cW
}

// Ticks X : un par mois, label tous les 2 mois
const xTicks = computed(() => {
  const ticks: { x: number; label: string }[] = []
  const start = new Date(props.goal.createdAt.slice(0, 10))
  for (let i = 0; i <= 12; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i)
    const x = PAD.l + (i / 12) * cW
    if (i % 2 === 0) ticks.push({ x, label: t(`savingsGoals.months.${d.getMonth() + 1}`) })
  }
  return ticks
})

// Série de données
const serie = computed(() => {
  const start = props.goal.createdAt.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const raw   = [
    { date: start, value: props.goal.startAmount },
    ...rawHistory.value.map(r => ({ date: r.date, value: r.cumulative })),
  ]
  const last = raw[raw.length - 1]!
  if (last.date !== today) raw.push({ date: today, value: props.goal.currentAmount })
  return [...new Map(raw.map(p => [p.date, p])).values()]
    .sort((a, b) => a.date.localeCompare(b.date))
})

const hasData = computed(() => serie.value.length >= 1)

interface Pt { x: number; y: number }

const yMax = computed(() => Math.max(props.goal.targetAmount, props.goal.currentAmount, 1))

function valueToY(val: number): number {
  return PAD.t + cH * (1 - Math.min(val, yMax.value) / yMax.value)
}

const chartPoints = computed<Pt[]>(() =>
  serie.value.map(p => ({ x: dateToX(p.date), y: valueToY(p.value) }))
)

const lastPt     = computed(() => chartPoints.value[chartPoints.value.length - 1] ?? null)
const linePoints = computed(() => chartPoints.value.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))

const areaPath = computed(() => {
  const pts = chartPoints.value
  if (!pts.length) return ''
  const bottom = (PAD.t + cH).toFixed(1)
  return [
    `M ${pts[0]!.x.toFixed(1)},${bottom}`,
    ...pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L ${pts[pts.length - 1]!.x.toFixed(1)},${bottom}`,
    'Z',
  ].join(' ')
})

// Projection en pointillé : depuis aujourd'hui → +monthlyRate/mois → targetAmount ou xEnd
const projectionPoints = computed(() => {
  const rate = props.monthlyRate ?? 0
  if (rate <= 0 || props.goal.currentAmount >= props.goal.targetAmount) return ''
  const today = new Date().toISOString().slice(0, 10)
  const pts: string[] = []
  // Ancre sur le dernier point réel
  const anchor = lastPt.value
  if (!anchor) return ''
  pts.push(`${anchor.x.toFixed(1)},${anchor.y.toFixed(1)}`)
  let current = props.goal.currentAmount
  const d = new Date(today)
  for (let i = 1; i <= 24; i++) {
    current = Math.min(current + rate, props.goal.targetAmount)
    d.setMonth(d.getMonth() + 1)
    const t = d.getTime()
    if (t > xEnd.value) break
    const x = PAD.l + ((Math.min(t, xEnd.value) - xStart.value) / xRange.value) * cW
    const y = valueToY(current)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    if (current >= props.goal.targetAmount) break
  }
  return pts.join(' ')
})

const gridLines = computed(() =>
  [0, 0.5, 1].map(f => ({
    y:     PAD.t + cH * (1 - f),
    label: fmtY(Math.round(yMax.value * f)),
  }))
)

const targetY = computed(() => {
  if (props.goal.targetAmount <= 0) return null
  const ratio = props.goal.targetAmount / yMax.value
  return PAD.t + cH * (1 - ratio)
})
</script>

<style scoped lang="scss">
.gec {
  width: 100%;

  &__svg {
    width: 100%;
    display: block;
  }

  &__empty {
    padding: 32px 0;
    text-align: center;
    font-size: 13px;
    color: var(--color-text-muted);
  }

  &__axis {
    stroke: var(--color-border);
    stroke-width: 1;
  }

  &__grid {
    stroke: var(--color-border-subtle);
    stroke-width: 1;
  }

  &__label {
    font-size: 9px;
    fill: var(--color-text-muted);
  }

  &__target-line {
    stroke: var(--color-text-muted);
    stroke-width: 1;
    stroke-dasharray: 4 3;
    opacity: 0.6;
  }

  &__line {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  &__projection {
    fill: none;
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    opacity: 0.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
}
</style>
