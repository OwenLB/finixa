<template>
  <div class="recurring-widget">
    <!-- Header -->
    <button class="recurring-widget__header" @click="expanded = !expanded">
      <div class="recurring-widget__title-row">
        <span class="recurring-widget__title">{{ $t('more.recurringTitle') }}</span>
        <span class="recurring-widget__subtitle">
          <template v-if="!expanded">
            {{ sevenDayItems.length
              ? $t('recurring.widget.upcoming', { n: sevenDayItems.length })
              : $t('recurring.widget.sevenDays') }}
          </template>
          <template v-else>{{ monthLabel }}</template>
        </span>
      </div>
      <ChevronDown :size="15" class="recurring-widget__chevron" :class="{ 'is-up': expanded }" />
    </button>

    <!-- Compact / Expanded (animated swap) -->
    <Transition name="rw-fade" mode="out-in">
      <!-- Expanded view -->
      <div v-if="expanded" key="expanded" class="recurring-widget__expanded">
        <div class="recurring-widget__month-list">
          <p v-if="!monthItems.length" class="recurring-widget__empty">
            {{ $t('recurring.widget.emptyMonth') }}
          </p>
          <div v-for="item in monthItems" :key="item.key" class="recurring-widget__item">
            <div class="recurring-widget__cat-icon" :style="{ background: item.color + '22' }">
              <component :is="getIcon(item.iconKey)" :size="11" :style="{ color: item.color }" />
            </div>
            <span class="recurring-widget__item-day">{{ fmtDayShort(item.date) }}</span>
            <span class="recurring-widget__item-name">{{ item.name }}</span>
            <span class="recurring-widget__item-amount" :style="{ color: item.color }">
              {{ fmt(Math.abs(item.amount)) }}
            </span>
          </div>
        </div>
        <DashboardRecurringCalendar :cells="cells" :day-labels="calDayLabels" />
      </div>

      <!-- Compact view : une ligne par catégorie (seulement si items à venir) -->
      <div v-else-if="sevenDayGroups.length" key="compact" class="recurring-widget__compact">
        <div class="recurring-widget__list">
          <div v-for="group in sevenDayGroups" :key="group.categoryName" class="recurring-widget__item">
            <div class="recurring-widget__cat-icon" :style="{ background: group.color + '22' }">
              <component :is="getIcon(group.iconKey)" :size="11" :style="{ color: group.color }" />
            </div>
            <span class="recurring-widget__item-name">
              {{ group.categoryName }}
              <span class="recurring-widget__item-count">({{ group.items.length }})</span>
            </span>
            <span class="recurring-widget__item-amount" :style="{ color: group.color }">
              {{ fmt(group.total) }}
            </span>
          </div>
        </div>
      </div>
      <!-- Collapsed + rien à venir : rien sous le header (ultra-compact) -->
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { getIcon }     from '~/utils/iconRegistry'
import { useRecurringWidgetData } from '~/composables/useRecurringWidgetData'

const { fmt }        = useCurrency()
const { locale }     = useI18n()
const expanded = ref(false)

const { sevenDayItems, sevenDayGroups, monthLabel, monthItems, cells, fmtDayShort } = useRecurringWidgetData()

// Labels de jours selon la locale (L M M J V S D)
const calDayLabels = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    new Date(2000, 0, 3 + i).toLocaleDateString(locale.value, { weekday: 'narrow' })
  )
)
</script>

<style scoped lang="scss">
.rw-fade-enter-active { transition: opacity 160ms ease, transform 160ms ease; }
.rw-fade-leave-active { transition: opacity 100ms ease, transform 100ms ease; }

.rw-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.rw-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// ── Widget ─────────────────────────────────────────────────────────────────────

.recurring-widget {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  margin: 0 $page-padding-x;
  overflow: hidden;

  @media (min-width: $breakpoint-lg) { margin: 0; }

  // ── Header ─────────────────────────────────────────────────────────────────

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px $page-padding-x;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--color-text-primary);
    gap: 8px;
    transition: opacity $transition-fast;

    &:active { opacity: 0.7; }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  &__subtitle {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__chevron {
    color: var(--color-text-muted);
    transition: transform $transition-base;
    flex-shrink: 0;

    &.is-up { transform: rotate(180deg); }
  }

  // ── Compact ─────────────────────────────────────────────────────────────────

  &__compact {
    padding: 0 $page-padding-x 16px;
  }

  &__list {
    display: flex;
    flex-direction: column;

    .recurring-widget__item + .recurring-widget__item {
      border-top: 1px solid var(--color-border-subtle);
    }
  }

  &__empty {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-align: center;
    padding: 4px 0;
    margin: 0;
  }

  // ── Row partagée ────────────────────────────────────────────────────────────

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
  }

  &__item-count {
    font-size: 0.6875rem;
    color: var(--color-text-muted);
    font-weight: 400;
    margin-left: 2px;
  }

  &__cat-icon {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__item-day {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    min-width: 58px;
    flex-shrink: 0;
  }

  &__item-name {
    font-size: 0.8125rem;
    color: var(--color-text-primary);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-amount {
    font-size: 0.8125rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  // ── Étendu ──────────────────────────────────────────────────────────────────

  &__expanded {
    padding: 0 $page-padding-x 16px;

    :deep(.rcal) { margin-top: 14px; }

    @media (min-width: $breakpoint-lg) {
      padding: 0 $page-padding-x 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 32px;
      align-items: start;

      :deep(.rcal) { margin-top: 0; }
    }
  }

  &__month-list {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    gap: 2px;

    @media (min-width: $breakpoint-lg) {
      border-top: none;
      border-right: 1px solid var(--color-border-subtle);
      padding-right: 32px;
      margin-top: 0;
      padding-top: 0;
    }

    .recurring-widget__item {
      padding: 4px 0;
    }
  }
}
</style>
