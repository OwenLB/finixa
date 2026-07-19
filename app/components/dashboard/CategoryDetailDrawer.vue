<template>
  <AppDrawer v-model="open">
    <template v-if="cat" #title>
      <button class="detail__title-btn" @click="emit('goToCategory', cat)">
        <span class="detail__title-text">{{ cat.name }}</span>
        <ChevronRight :size="18" class="detail__title-chevron" />
      </button>
    </template>

    <div v-if="cat" class="detail">

      <!-- Alerte catégorie variable -->
      <div v-if="alert" class="detail__alert" :style="{ '--ac': alert.color }">
        <div class="detail__alert-top">
          <span class="detail__alert-badge">{{ alert.title }}</span>
        </div>
        <div class="detail__alert-stats">
          <div class="detail__alert-stat">
            <span class="detail__alert-stat-num">
              {{ alert.day }}<span class="detail__alert-stat-denom">/{{ alert.daysInMonth }}</span>
            </span>
            <span class="detail__alert-stat-label">Jour du mois</span>
          </div>
          <div class="detail__alert-stat-arrow">→</div>
          <div class="detail__alert-stat">
            <span class="detail__alert-stat-num detail__alert-stat-num--accent">{{ alert.ratioBudgetPct }}%</span>
            <span class="detail__alert-stat-label">du budget</span>
          </div>
        </div>
        <p class="detail__alert-advice">{{ alert.advice }}</p>
      </div>

      <UiBreakdownPanel :segments="catBreakdown.segments" :total="catBreakdown.total">
        <span class="breakdown-total">{{ fmt(catBreakdown.total) }}</span>
        <span class="breakdown-total-label">{{ $t('dashboard.total') }}</span>
      </UiBreakdownPanel>

      <div v-if="catBreakdown.total > 0" class="detail__separator" />

      <button
        v-for="(sub, i) in cat.subcategories"
        :key="sub.id"
        class="detail__row"
        @click="emit('goToSubcategory', sub, cat)"
      >
        <div class="detail__info">
          <span class="detail__name">
            {{ sub.name }} <span class="detail__count">({{ sub.count }})</span>
            <span v-if="sub.excluded" class="detail__excluded-badge">{{ $t('dashboard.excludedBadge') }}</span>
          </span>
          <div class="detail__info-right">
            <span class="detail__amounts">
              <span class="detail__spent" :style="sub.excluded ? { color: '#ef4444' } : {}">{{ fmt(sub.spent) }}</span>
              <span v-if="sub.id !== '__other__' && sub.budget != null" class="detail__budget"> / {{ fmt(sub.budget) }}</span>
            </span>
            <ChevronRight :size="13" class="detail__chevron" />
          </div>
        </div>
        <UiBudgetProgressBar
          v-if="sub.budget != null && sub.budget > 0"
          :value="sub.spent"
          :max="sub.budget"
          :color="subColors[i] ?? baseColor"
          :excess-color="cat.type === 'depense' ? undefined : darkenHex(subColors[i] ?? baseColor)"
        />
      </button>

      <div v-if="!cat.subcategories.length" class="detail__empty">
        Aucune sous-catégorie
      </div>
    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { deriveSubColors, darkenHex } from '~/utils/colorUtils'
import { useTheme } from '~/composables/useTheme'
import { useCategoryStatsStore } from '~/stores/useCategoryStatsStore'
import { usePeriodStore } from '~/stores/usePeriodStore'
import type { EnrichedCategory, EnrichedSub } from '~/types/dashboard'

const props = defineProps<{
  modelValue: boolean
  cat:        EnrichedCategory | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  goToCategory:       [cat: EnrichedCategory]
  goToSubcategory:    [sub: EnrichedSub, cat: EnrichedCategory]
}>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const categoryStatsStore = useCategoryStatsStore()
const periodStore        = usePeriodStore()
const { isDark }         = useTheme()
const { fmt }            = useCurrency()

const ALERT_COLORS = { green: '#22c55e', orange: '#f97316', red: '#ef4444' } as const

const alert = computed(() => {
  const cat = props.cat
  if (!cat || !cat.isVariable || cat.budget <= 0 || cat.spent <= 0) return null

  const now          = new Date()
  const currentYM    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (periodStore.month !== currentYM) return null

  const day          = now.getDate()
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const ratioMois    = day / daysInMonth
  const ratioBudget  = cat.spent / cat.budget

  const ratioMoisPct   = Math.round(ratioMois   * 100)
  const ratioBudgetPct = Math.round(ratioBudget * 100)

  let level: keyof typeof ALERT_COLORS
  let title: string
  let advice: string

  if (cat.spent > cat.budget) {
    level  = 'red'
    title  = 'Budget dépassé 🚨'
    advice = `Dépassement de ${fmt(cat.spent - cat.budget)} — toute nouvelle dépense l'aggrave.`
  } else if (ratioBudget > ratioMois + 0.30) {
    level  = 'red'
    title  = 'Rythme trop élevé 🚨'
    advice = `Le budget sera épuisé bien avant la fin du mois si ce rythme continue.`
  } else if (ratioBudget > ratioMois + 0.15) {
    level  = 'orange'
    title  = 'Un peu rapide ⚠️'
    advice = `Ralentissez légèrement pour rester dans les limites du budget.`
  } else {
    level  = 'green'
    title  = 'Dans les clous ✅'
    advice = `Votre rythme de dépenses est cohérent avec l'avancement du mois.`
  }

  return {
    level,
    title,
    advice,
    color: ALERT_COLORS[level],
    day,
    daysInMonth,
    ratioMoisPct,
    ratioBudgetPct,
  }
})

// Catégorie « exclue des calculs » (désépargne) → affichée en rouge
const baseColor = computed(() => props.cat?.excluded ? '#ef4444' : (props.cat?.color ?? '#ef4444'))

const subColors = computed(() => {
  if (!props.cat) return []
  return deriveSubColors(baseColor.value, props.cat.subcategories.length, isDark.value)
})

const catBreakdown = computed(() => {
  if (!props.cat) return { segments: [], total: 0 }
  const total  = categoryStatsStore.categorySpent.get(props.cat.id)?.totalSpent ?? 0
  const subs   = props.cat.subcategories.filter(s => s.spent > 0)
  const colors = deriveSubColors(baseColor.value, props.cat.subcategories.length, isDark.value)
  return {
    total,
    segments: subs.map(sub => ({
      name:  sub.name,
      color: colors[props.cat!.subcategories.findIndex(s => s.id === sub.id)] ?? baseColor.value,
      value: sub.spent,
    })),
  }
})
</script>

<style scoped lang="scss">
.breakdown-total {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.breakdown-total-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
    width: 100%;
    text-align: left;
    transition: opacity $transition-fast;

    & + & { border-top: 1px solid var(--color-border-subtle); }
    &:active { opacity: 0.6; }
  }

  &__title-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
    transition: opacity $transition-fast;
    &:active { opacity: 0.6; }
  }

  &__title-text {
    font-family: var(--font-title);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__title-chevron { color: var(--color-text-muted); flex-shrink: 0; }

  &__info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__info-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__chevron { color: var(--color-text-muted); flex-shrink: 0; }

  &__name {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  &__count {
    font-size: 12px;
    font-weight: 400;
    color: var(--color-text-muted);
  }

  &__excluded-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #ef4444;
    background: #ef444422;
    border-radius: 4px;
    padding: 1px 5px;
    margin-left: 4px;
  }

  &__amounts {
    font-size: 13px;
    flex-shrink: 0;
  }

  &__spent {
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__budget { color: var(--color-text-muted); }

  &__separator {
    height: 1px;
    background: var(--color-border);
    margin: 4px 0;
  }

  &__empty {
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
    color: var(--color-text-muted);
  }

  // ── Alerte variable ────────────────────────────────────────────────────────

  &__alert {
    border-left: 3px solid var(--ac);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    background: color-mix(in srgb, var(--ac) 8%, transparent);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 4px;
  }

  &__alert-top { display: flex; align-items: center; }

  &__alert-badge {
    font-size: 12px;
    font-weight: 700;
    color: var(--ac);
    letter-spacing: 0.01em;
  }

  &__alert-stats {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__alert-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__alert-stat-num {
    font-size: 22px;
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1;

    &--accent { color: var(--ac); }
  }

  &__alert-stat-denom {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  &__alert-stat-label {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  &__alert-stat-arrow {
    font-size: 18px;
    color: var(--color-text-muted);
    flex-shrink: 0;
    margin-top: -6px;
  }

  &__alert-advice {
    font-size: 12px;
    color: var(--color-text-muted);
    line-height: 1.5;
    border-top: 1px solid color-mix(in srgb, var(--ac) 20%, transparent);
    padding-top: 8px;
    margin: 0;
  }
}
</style>
