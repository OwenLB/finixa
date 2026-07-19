<template>
  <div class="theme-picker">

    <!-- Système -->
    <button class="theme-card" @click="setTheme('system')">
      <div class="tp-face tp-face--system" :class="{ 'tp-face--active': theme === 'system' }">
        <div class="tp-half tp-half--light">
          <ThemePreviewHalf mode="light" compact />
        </div>
        <div class="tp-half tp-half--dark">
          <ThemePreviewHalf mode="dark" compact />
        </div>
      </div>
      <span class="theme-card__label">{{ $t('theme.system') }}</span>
    </button>

    <!-- Clair -->
    <button class="theme-card" @click="setTheme('light')">
      <div class="tp-face tp-face--light" :class="{ 'tp-face--active': theme === 'light' }">
        <ThemePreviewHalf mode="light" />
      </div>
      <span class="theme-card__label">{{ $t('theme.light') }}</span>
    </button>

    <!-- Sombre -->
    <button class="theme-card" @click="setTheme('dark')">
      <div class="tp-face tp-face--dark" :class="{ 'tp-face--active': theme === 'dark' }">
        <ThemePreviewHalf mode="dark" />
      </div>
      <span class="theme-card__label">{{ $t('theme.dark') }}</span>
    </button>

  </div>
</template>

<script setup lang="ts">
import ThemePreviewHalf from './ThemePreviewHalf.vue'

const { theme }  = useTheme()
const prefsStore = usePreferencesStore()
const setTheme   = prefsStore.setTheme
</script>

<style scoped lang="scss">
.theme-picker {
  display: flex;
  gap: 10px;
}

.theme-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;

  &__label {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-muted);
  }
}

.tp-face {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  border: 2px solid var(--color-border);
  transition: border-color $transition-fast;

  &--active { border-color: var(--color-text-primary); }

  &--light { background: #f5f5f5; }
  &--dark  { background: #141414; }
  &--system { flex-direction: column; }
}

.tp-half {
  flex: 1;
  display: flex;
  overflow: hidden;

  &--light { background: #f5f5f5; }
  &--dark  { background: #141414; }
}
</style>
