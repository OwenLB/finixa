<template>
  <MoreSection :title="$t('more.sections.period')">
    <MoreSettingsRow :label="$t('more.periodStartDay')" icon-bg="#f472b620" clickable chevron @click="drawerOpen = true">
      <template #icon><CalendarDays :size="16" style="color:#f472b6" /></template>
      <span class="period__value">{{ currentLabel }}</span>
    </MoreSettingsRow>
  </MoreSection>

  <AppDrawer v-model="drawerOpen" :title="$t('more.periodStartDay')">
    <div class="period-picker">
      <p class="period-picker__hint">{{ $t('more.periodStartDayHint') }}</p>

      <UiDayOfMonthGrid :model-value="selected" :max="31" @update:model-value="select" />

      <p v-if="selected >= 29" class="period-picker__warning">
        {{ $t('more.periodStartDayShortWarning') }}
      </p>
    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
import { CalendarDays } from 'lucide-vue-next'

const { t } = useI18n()
const prefsStore = usePreferencesStore()

const drawerOpen = ref(false)
const selected   = computed(() => prefsStore.periodStartDay)

const currentLabel = computed(() =>
  selected.value === 1
    ? t('more.periodStartDayDefault')
    : t('more.periodStartDayValue', { day: selected.value })
)

async function select(day: number) {
  await prefsStore.setPeriodStartDay(day)
  drawerOpen.value = false
}
</script>

<style scoped lang="scss">
.period__value {
  font-size: 13px;
  color: var(--color-text-muted);
}

.period-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__hint {
    font-size: 13px;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__warning {
    font-size: 12px;
    color: #fbbf24;
    line-height: 1.5;
    padding: 10px 12px;
    background: #fbbf2412;
    border-radius: var(--radius-sm);
    border: 1px solid #fbbf2430;
  }
}
</style>
