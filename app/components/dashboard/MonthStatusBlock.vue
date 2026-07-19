<template>
  <div class="month-status" :class="`month-status--${level}`">

    <!-- ── Header (always visible) ─────────────────────────────── -->
    <button
      class="month-status__header"
      :class="{ 'month-status__header--static': !canExpand }"
      @click="toggle"
    >
      <div class="month-status__hero">
        <component :is="levelIcon" class="month-status__icon" :size="20" />
        <div class="month-status__hero-text">
          <span class="month-status__title">{{ levelLabel }}</span>
        </div>
        <div class="month-status__score-num">
          <span class="month-status__score-value">{{ score }}</span>
          <span class="month-status__score-max">/100</span>
        </div>
        <ChevronDown v-if="canExpand" class="month-status__chevron" :class="{ 'month-status__chevron--up': expanded }" :size="16" />
      </div>

      <div class="month-status__score-row">
        <div class="month-status__score-wrap">
          <div class="month-status__score-track">
            <div class="month-status__score-fill" :style="{ width: `${score}%` }" />
          </div>
          <span
            class="month-status__score-marker month-status__score-marker--moyen"
            :class="{ 'month-status__score-marker--passed': score >= 40 }"
          />
          <span
            class="month-status__score-marker month-status__score-marker--ok"
            :class="{ 'month-status__score-marker--passed': score >= 70 }"
          />
        </div>
      </div>
    </button>

    <!-- ── Expanded detail ──────────────────────────────────────── -->
    <Transition name="expand">
      <div v-if="expanded" class="month-status__detail">

        <!-- Section Budget & rythme -->
        <div v-if="alerts.length || goodCategories.length" class="ms-section">
          <p class="ms-section__title">Budget & rythme</p>

          <div v-if="advice" class="ms-section__advice">
            <Lightbulb :size="13" class="ms-section__advice-icon" />
            <span>{{ advice }}</span>
          </div>

          <div v-for="alert in alerts" :key="alert.categoryId" class="ms-section__row">
            <span class="ms-section__dot" :style="{ background: alert.categoryColor }" />
            <span class="ms-section__name">{{ alert.categoryName }}</span>
            <span class="ms-section__amounts">
              {{ fmt(alert.spent) }}<span class="ms-section__budget"> / {{ fmt(alert.budget) }}</span>
            </span>
            <span class="ms-section__velocity" :class="velocityClass(alert.spent, alert.budget)">{{ velocityPct(alert.spent, alert.budget) }}</span>
          </div>

          <div v-for="cat in goodCategories" :key="cat.categoryId" class="ms-section__row">
            <span class="ms-section__dot" :style="{ background: cat.categoryColor }" />
            <span class="ms-section__name">{{ cat.categoryName }}</span>
            <span class="ms-section__amounts">
              {{ fmt(cat.spent) }}<span class="ms-section__budget"> / {{ fmt(cat.budget) }}</span>
            </span>
            <span class="ms-section__velocity" :class="velocityClass(cat.spent, cat.budget)">{{ velocityPct(cat.spent, cat.budget) }}</span>
          </div>
        </div>

        <!-- Section Épargne -->
        <div v-if="savingsStatus" class="ms-section">
          <p class="ms-section__title">Épargne</p>
          <div class="ms-section__row">
            <span class="ms-section__dot ms-section__dot--savings" />
            <span class="ms-section__name">Épargne du mois</span>
            <span class="ms-section__amounts">
              {{ fmt(savingsStatus.spent) }}<span class="ms-section__budget"> / {{ fmt(savingsStatus.budget) }}</span>
            </span>
            <span
              v-if="savingsStatus.spent >= savingsStatus.budget"
              class="ms-section__badge ms-section__badge--done"
            >Objectif atteint</span>
            <span
              v-else-if="savingsStatus.spent > 0"
              class="ms-section__badge ms-section__badge--progress"
            >{{ fmt(savingsStatus.budget - savingsStatus.spent) }} restant</span>
          </div>
        </div>

        <!-- Section Revenus -->
        <div v-if="missingRevenue" class="ms-section">
          <p class="ms-section__title">Revenus</p>
          <div class="ms-section__row">
            <TriangleAlert :size="12" class="ms-section__warn-icon" />
            <span class="ms-section__name">En attente</span>
            <span class="ms-section__amounts">
              {{ fmt(missingRevenue.received) }}<span class="ms-section__budget"> / {{ fmt(missingRevenue.expected) }}</span>
            </span>
            <span class="ms-section__velocity ms-section__velocity--negative">{{ `-${fmt(missingRevenue.gap)}` }}</span>
          </div>
        </div>

        <!-- Détail du score (collapsed par défaut) -->
        <div class="month-status__section month-status__score-detail">
          <button class="month-status__score-toggle" @click.stop="scoreExpanded = !scoreExpanded">
            <span class="month-status__section-title">Détail du score</span>
            <ChevronDown :size="13" class="month-status__score-chevron" :class="{ 'month-status__score-chevron--up': scoreExpanded }" />
          </button>
          <template v-if="scoreExpanded">
            <div
              v-for="part in scoreBreakdown"
              :key="part.key"
              class="month-status__score-part"
              :class="{
                'month-status__score-part--neutral': part.neutral,
                'month-status__score-part--na': part.na,
              }"
            >
              <span class="month-status__score-part-label">{{ part.label }}</span>
              <div class="month-status__score-part-track">
                <div
                  v-if="!part.na"
                  class="month-status__score-part-fill"
                  :style="{ width: `${(part.pts / part.max) * 100}%` }"
                />
              </div>
              <span class="month-status__score-part-pts">
                <template v-if="part.na">—</template>
                <template v-else>{{ part.pts }}<span class="month-status__score-part-max">/{{ part.max }}</span></template>
              </span>
            </div>
          </template>
        </div>

      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { AlertCircle, CheckCircle2, ChevronDown, Lightbulb, TriangleAlert, XCircle } from 'lucide-vue-next'
import { useMonthStatus } from '~/composables/useMonthStatus'

const { level, score, scoreBreakdown, alerts, goodCategories, missingRevenue, savingsStatus, progressRatio, remainingDays } = useMonthStatus()
const { fmt } = useCurrency()

function velocityPct(spent: number, budget: number): string {
  if (budget <= 0 || progressRatio.value <= 0) return ''
  // Positive = marge (under pace), negative = dépassement (over pace)
  const delta = Math.round((progressRatio.value - spent / budget) * 100)
  return delta > 0 ? `+${delta}%` : `${delta}%`
}

function velocityClass(spent: number, budget: number): string {
  if (budget <= 0 || progressRatio.value <= 0) return ''
  const delta = progressRatio.value - spent / budget
  if (delta > 0.005) return 'ms-section__velocity--positive'
  if (delta < -0.005) return 'ms-section__velocity--negative'
  return ''
}

const expanded      = ref(false)
const scoreExpanded = ref(false)
const canExpand = computed(() =>
  level.value !== 'ok' ||
  goodCategories.value.length > 0 ||
  !!missingRevenue.value ||
  !!savingsStatus.value
)

function toggle() {
  if (canExpand.value) expanded.value = !expanded.value
}

const LEVEL_LABEL = { ok: 'Dans les clous', moyen: 'En tension', mauvais: 'Hors budget' } as const
const LEVEL_ICON  = { ok: CheckCircle2, moyen: AlertCircle, mauvais: XCircle } as const

const levelLabel = computed(() => LEVEL_LABEL[level.value])
const levelIcon  = computed(() => LEVEL_ICON[level.value])


const advice = computed<string | null>(() => {
  if (alerts.value.length === 0) return null
  const worstVariable = alerts.value.find(a => a.isVariable)
  if (worstVariable && remainingDays.value > 0) {
    const remaining = worstVariable.budget - worstVariable.spent
    if (remaining > 0) {
      const dailyAllowed = remaining / remainingDays.value
      return `Limiter ${worstVariable.categoryName} à ~${fmt(dailyAllowed)}/jour d'ici la fin du mois stabiliserait votre budget.`
    }
    return `Réduire les dépenses ${worstVariable.categoryName} de ${fmt(worstVariable.spent - worstVariable.budget)} permettrait de revenir dans les clous.`
  }
  const worst = alerts.value[0]!
  if (worst.spent > worst.budget) {
    return `La catégorie ${worst.categoryName} dépasse son budget de ${fmt(worst.spent - worst.budget)} ce mois-ci.`
  }
  if (remainingDays.value > 0) {
    const dailyAllowed = (worst.budget - worst.spent) / remainingDays.value
    return `Limiter ${worst.categoryName} à ~${fmt(dailyAllowed)}/jour stabiliserait votre budget.`
  }
  return null
})
</script>

<style scoped lang="scss">
.month-status {
  --color-advisory: #fbbf24;

  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;

  &--ok {
    --status-color:  #34d399;
    --status-bg:     rgba(52, 211, 153, 0.12);
    --status-border: rgba(52, 211, 153, 0.25);
  }
  &--moyen {
    --status-color:  #fbbf24;
    --status-bg:     rgba(251, 191, 36, 0.12);
    --status-border: rgba(251, 191, 36, 0.25);
  }
  &--mauvais {
    --status-color:  #f87171;
    --status-bg:     rgba(248, 113, 113, 0.12);
    --status-border: rgba(248, 113, 113, 0.25);
  }
}

// ── Header ─────────────────────────────────────────────────────────────────
.month-status__header {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 14px 14px 16px;
  text-align: left;
  background: var(--status-bg);
  transition: opacity $transition-fast;

  &:active         { opacity: 0.7; }
  &--static        { cursor: default; }
  &--static:active { opacity: 1; }
}

// ── Hero row ───────────────────────────────────────────────────────────────
.month-status__hero {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.month-status__icon {
  color: var(--status-color);
  flex-shrink: 0;
  margin-top: 1px;
}

.month-status__hero-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.month-status__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--status-color);
  line-height: 1.2;
}

.month-status__chevron {
  color: var(--color-text-muted);
  flex-shrink: 0;
  margin-top: 2px;
  transition: transform $transition-fast;

  &--up { transform: rotate(180deg); }
}



// ── Score bar ──────────────────────────────────────────────────────────────
.month-status__score-row {
  display: flex;
  align-items: center;
}

.month-status__score-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.month-status__score-track {
  width: 100%;
  height: 3px;
  border-radius: 99px;
  background: var(--color-bg-elevated);
  overflow: hidden;
}

.month-status__score-marker {
  --marker-color: #34d399;

  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--marker-color);
  background: transparent;
  pointer-events: none;
  transition: background $transition-fast, border-color $transition-fast;

  &--moyen { left: 40%; --marker-color: #fbbf24; }
  &--ok    { left: 70%; --marker-color: #34d399; }

  // Bullseye : point central + liseré blanc + contour coloré
  &--passed {
    background: var(--status-color);
    border: 2px solid var(--color-bg-surface);
    outline: 1.5px solid var(--status-color);
    width: 9px;
    height: 9px;
  }
}

.month-status__score-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--status-color);
  transition: width $transition-base;
}

.month-status__score-num {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
}

.month-status__score-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--status-color);
  line-height: 1;
}

.month-status__score-max {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-muted);
}

// ── Expanded detail ────────────────────────────────────────────────────────
.month-status__detail {
  border-top: 1px solid var(--status-border);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

// ── Sections neutres ───────────────────────────────────────────────────────
.ms-section {
  display: flex;
  flex-direction: column;
}

.ms-section__title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.ms-section__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;

  & + & { border-top: 1px solid rgba(128, 128, 128, 0.08); }
}

.ms-section__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;

  &--savings { background: var(--color-text-muted); }
}

.ms-section__warn-icon {
  color: var(--color-advisory);
  flex-shrink: 0;
}

.ms-section__name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ms-section__amounts {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.ms-section__budget {
  font-weight: 400;
  color: var(--color-text-muted);
}

.ms-section__velocity {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  flex-shrink: 0;
  min-width: 32px;
  text-align: right;

  &--positive { color: #34d399; }
  &--negative { color: #f87171; }
}

.ms-section__badge {
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;

  &--done     { color: var(--status-color); }
  &--progress { color: var(--color-text-muted); }
}

.ms-section__advice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.18);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--color-text-primary);
}

.ms-section__advice-icon {
  color: var(--color-advisory);
  flex-shrink: 0;
  margin-top: 2px;
}

// ── Score breakdown ────────────────────────────────────────────────────────
.month-status__score-detail {
  gap: 7px;
}

.month-status__score-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  margin-bottom: 4px;
  padding: 0;
  cursor: pointer;

  .month-status__section-title { margin-bottom: 0; }
}

.month-status__score-chevron {
  color: var(--color-text-muted);
  transition: transform $transition-fast;

  &--up { transform: rotate(180deg); }
}

.month-status__score-part {
  display: flex;
  align-items: center;
  gap: 10px;

  // pts earned but from default/neutral data — muted, not celebratory
  &--neutral {
    .month-status__score-part-fill { opacity: 0.3; }
    .month-status__score-part-pts  { color: var(--color-text-muted); font-weight: 400; }
  }

  // not configured at all — dim everything
  &--na {
    .month-status__score-part-label { color: var(--color-text-muted); }
    .month-status__score-part-pts   { color: var(--color-text-muted); font-weight: 400; }
  }
}

.month-status__score-part-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
}

.month-status__score-part-track {
  flex: 1;
  height: 3px;
  border-radius: 99px;
  background: var(--color-bg-elevated);
  overflow: hidden;
}

.month-status__score-part-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--status-color);
  opacity: 0.75;
}

.month-status__score-part-pts {
  font-size: 11px;
  font-weight: 700;
  color: var(--status-color);
  flex-shrink: 0;
  min-width: 34px;
  text-align: right;
}

.month-status__score-part-max {
  font-weight: 400;
  color: var(--color-text-muted);
}

// Sections génériques
.month-status__section {
  display: flex;
  flex-direction: column;
}

.month-status__section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

// ── Transition ─────────────────────────────────────────────────────────────
.expand-enter-active,
.expand-leave-active {
  transition: opacity $transition-base, max-height $transition-base;
  max-height: 700px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>

<style lang="scss">
// Light theme — status colors with proper contrast ratios
[data-theme='light'] {
  .month-status__score-marker--moyen { --marker-color: #ea580c; }
  .month-status__score-marker--ok    { --marker-color: #059669; }
  .month-status {
    --color-advisory: #ea580c;
  }
  .month-status__revenue-warning {
    background: rgba(234, 88, 12, 0.07);
    border-color: rgba(234, 88, 12, 0.18);
  }
  .month-status--ok {
    --status-color:  #059669;
    --status-bg:     rgba(5, 150, 105, 0.08);
    --status-border: rgba(5, 150, 105, 0.20);
  }
  .month-status--moyen {
    --status-color:  #ea580c;
    --status-bg:     rgba(234, 88, 12, 0.07);
    --status-border: rgba(234, 88, 12, 0.18);
  }
  .month-status--mauvais {
    --status-color:  #dc2626;
    --status-bg:     rgba(220, 38, 38, 0.07);
    --status-border: rgba(220, 38, 38, 0.18);
  }
  .ms-section__velocity--positive { color: #059669; }
  .ms-section__velocity--negative { color: #dc2626; }
  .ms-section__advice {
    background: rgba(234, 88, 12, 0.06);
    border-color: rgba(234, 88, 12, 0.16);
  }
}
</style>
