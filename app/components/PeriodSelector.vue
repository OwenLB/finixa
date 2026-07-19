<template>
  <div
    class="ps"
    @pointerdown="swipe.onPointerDown"
    @pointermove="swipe.onPointerMove"
    @pointerup="onSwipeUp"
    @pointercancel="swipe.reset"
  >
    <button class="ps__arrow" :aria-label="$t('a11y.previous')" @click="store.prev()">
      <ChevronLeft :size="18" />
    </button>

    <button class="ps__label" :title="$t('periodSelector.doubleTapToday')" @click="onLabelClick">
      <span>{{ store.label }}</span>
      <span v-if="store.periodRangeLabel" class="ps__sublabel">{{ store.periodRangeLabel }}</span>
    </button>

    <button
      class="ps__arrow"
      :class="{ 'ps__arrow--disabled': !store.canGoNext }"
      :disabled="!store.canGoNext"
      :aria-label="$t('a11y.next')"
      @click="store.next()"
    >
      <ChevronRight :size="18" />
    </button>
  </div>

  <AppDrawer v-model="pickerOpen" :title="$t('periodSelector.choosePeriod')">
    <div class="ps-picker">
      <div class="ps-picker__year-nav">
        <button class="ps-picker__year-arrow" :aria-label="$t('a11y.previous')" @click="pickerYear--">
          <ChevronLeft :size="18" />
        </button>
        <span class="ps-picker__year-label">{{ pickerYear }}</span>
        <button
          class="ps-picker__year-arrow"
          :class="{ 'ps-picker__year-arrow--disabled': pickerYear >= currentYear }"
          :disabled="pickerYear >= currentYear"
          :aria-label="$t('a11y.next')"
          @click="pickerYear++"
        >
          <ChevronRight :size="18" />
        </button>
      </div>

      <button
        v-if="store.month !== store.todayKey"
        class="ps-picker__today"
        @click="store.set(store.todayKey); pickerOpen = false"
      >
        {{ $t('periodSelector.backToToday') }}
      </button>

      <div class="ps-picker__grid">
        <button
          v-for="(label, i) in monthLabels"
          :key="i"
          class="ps-picker__month"
          :class="{
            'ps-picker__month--selected': isSelected(pickerYear, i + 1),
            'ps-picker__month--disabled': isDisabled(pickerYear, i + 1),
          }"
          :disabled="isDisabled(pickerYear, i + 1)"
          @click="pick(pickerYear, i + 1)"
        >
          {{ label }}
        </button>
      </div>
    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { usePeriodStore } from '~/stores/usePeriodStore'
import { useSwipe }       from '~/composables/useSwipe'
import { useHaptics }     from '~/composables/useHaptics'

const store      = usePeriodStore()
const { locale } = useI18n()
const haptics    = useHaptics()
const swipe      = useSwipe({ threshold: 60, minDrag: 10 })
const pickerOpen  = ref(false)
const currentYear = computed(() => Number(store.todayKey.slice(0, 4)))
const pickerYear  = ref(Number(store.month.slice(0, 4)))

// ── Swipe navigation ──────────────────────────────────────────────
function onSwipeUp(e: PointerEvent) {
  const result = swipe.onPointerUp(e)
  if (result === 'left')  { store.next(); haptics.impact('light') }
  if (result === 'right') { store.prev(); haptics.impact('light') }
  swipe.reset()
}

// ── Double tap → mois en cours ────────────────────────────────────
// Premier tap : on attend 310ms avant d'ouvrir le picker, pour détecter
// un éventuel double tap qui doit ramener au mois courant sans ouvrir.
let lastLabelTap = 0
let pickerOpenTimer: ReturnType<typeof setTimeout> | null = null

function onLabelClick() {
  const now = Date.now()
  if (now - lastLabelTap < 300) {
    lastLabelTap = 0
    if (pickerOpenTimer) { clearTimeout(pickerOpenTimer); pickerOpenTimer = null }
    if (store.month !== store.todayKey) {
      store.set(store.todayKey)
      haptics.impact('light')
    }
    return
  }
  lastLabelTap = now
  if (pickerOpenTimer) clearTimeout(pickerOpenTimer)
  pickerOpenTimer = setTimeout(() => {
    pickerOpenTimer = null
    pickerOpen.value = true
  }, 310)
}

onUnmounted(() => { if (pickerOpenTimer) clearTimeout(pickerOpenTimer) })

watch(pickerOpen, (open) => {
  if (open) pickerYear.value = Number(store.month.slice(0, 4))
})

const monthLabels = computed(() =>
  Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString(locale.value, { month: 'short' })
  )
)

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function isSelected(year: number, month: number) {
  return store.month === monthKey(year, month)
}

function isDisabled(year: number, month: number) {
  return monthKey(year, month) > store.todayKey
}

function pick(year: number, month: number) {
  store.set(monthKey(year, month))
  pickerOpen.value = false
}
</script>

<style scoped lang="scss">
.ps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  touch-action: pan-y;

  &__arrow {
    position: relative;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 99px;
    color: var(--color-text-primary);
    transition: background $transition-fast, opacity $transition-fast;

    // Cible tactile portée à 44px sans changer la taille visuelle (U26)
    &::after {
      content: '';
      position: absolute;
      inset: -4px;
    }

    &:active { background: var(--color-bg-elevated); }

    &--disabled {
      opacity: 0.25;
      pointer-events: none;
    }
  }

  &__label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 6px 12px;
    border-radius: 99px;
    transition: background $transition-fast;

    &:active { background: var(--color-bg-elevated); }

    span:first-child {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-primary);
      text-transform: capitalize;
    }
  }

  &__sublabel {
    font-size: 11px;
    font-weight: 400;
    color: var(--color-text-muted);
    letter-spacing: 0.01em;
  }
}

.ps-picker {
  display: flex;
  flex-direction: column;
  gap: 20px;

  &__year-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: 4px;
  }

  &__year-arrow {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    transition: background $transition-fast, opacity $transition-fast;

    &:active { background: var(--color-border-subtle); }

    &--disabled {
      opacity: 0.25;
      pointer-events: none;
    }
  }

  &__year-label {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__today {
    width: 100%;
    padding: 13px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-accent);
    background: var(--color-bg-elevated);
    text-align: center;
    transition: opacity $transition-fast;

    &:active { opacity: 0.7; }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  &__month {
    padding: 12px 0;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-primary);
    background: var(--color-bg-elevated);
    transition: background $transition-fast, opacity $transition-fast;
    text-align: center;

    &:active { opacity: 0.7; }

    &--selected {
      background: var(--color-accent);
      color: var(--color-accent-fg);
      font-weight: 600;
    }

    &--disabled {
      opacity: 0.2;
      pointer-events: none;
    }
  }
}
</style>
