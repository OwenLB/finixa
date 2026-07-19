<template>
  <MoreSection :title="$t('more.sections.appearance')">
    <template #before>
      <MoreThemePicker />
    </template>
    <MoreSettingsRow :label="$t('more.currency')" icon-bg="#34d39920" clickable chevron @click="currencyDrawer = true">
      <template #icon><Coins :size="16" style="color:#34d399" /></template>
      <span class="appearance__value">{{ currencyStore.currency }}</span>
    </MoreSettingsRow>
    <MoreSettingsRow :label="$t('more.language')" icon-bg="#818cf820" clickable chevron @click="langDrawer = true">
      <template #icon><Languages :size="16" style="color:#818cf8" /></template>
      <span class="appearance__value">{{ currentLocaleLabel }}</span>
    </MoreSettingsRow>
  </MoreSection>

  <AppDrawer v-model="currencyDrawer" :title="$t('more.currency')">
    <MorePickerList
      :items="currencies"
      :model-value="currencyStore.currency"
      @update:model-value="selectCurrency"
    />
  </AppDrawer>

  <AppDrawer v-model="langDrawer" :title="$t('more.language')">
    <MorePickerList
      :items="localeItems"
      :model-value="locale"
      @update:model-value="selectLocale"
    />
  </AppDrawer>
</template>

<script setup lang="ts">
import { Coins, Languages } from 'lucide-vue-next'
import { CURRENCY_FLAGS } from '~/data/currencies'

const LOCALES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English',  flag: '🇬🇧' },
]

const { t, locale } = useI18n()
const currencyStore = useCurrencyStore()
const prefsStore    = usePreferencesStore()

const currencyDrawer = ref(false)
const langDrawer     = ref(false)

const currencies = computed(() =>
  Object.keys(CURRENCY_FLAGS).map(code => ({
    code,
    flag:     CURRENCY_FLAGS[code],
    label:    t(`currencies.${code}`),
    sublabel: code,
  }))
)

const localeItems = LOCALES.map(l => ({ code: l.code, label: l.name, flag: l.flag }))

const currentLocaleLabel = computed(() =>
  LOCALES.find(l => l.code === locale.value)?.name ?? locale.value
)

function selectCurrency(code: string) {
  prefsStore.setCurrency(code)
  currencyDrawer.value = false
}

function selectLocale(code: string) {
  prefsStore.setLocale(code)
  langDrawer.value = false
}
</script>

<style scoped lang="scss">
.appearance__value {
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
