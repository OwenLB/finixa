<template>
  <nav class="tab-bar">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="tab-bar__item"
      :class="{ 'tab-bar__item--add': item.isAdd }"
      active-class="tab-bar__item--active"
      :exact="item.exact"
      :aria-label="item.isAdd ? t('nav.add') : undefined"
    >
      <component :is="item.icon" :size="item.isAdd ? 22 : 24" :stroke-width="item.isAdd ? 2.5 : 2" />
      <span v-if="!item.isAdd" class="tab-bar__label">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { LayoutGrid, ReceiptText, Plus, Wallet, Ellipsis } from 'lucide-vue-next'

const { t } = useI18n()

const navItems = computed(() => [
  { to: '/',             icon: LayoutGrid,  label: t('nav.dashboard'),    exact: true,  isAdd: false },
  { to: '/transactions', icon: ReceiptText, label: t('nav.transactions'), exact: false, isAdd: false },
  { to: '/add',          icon: Plus,        label: '',                    exact: false, isAdd: true  },
  { to: '/budget',       icon: Wallet,      label: t('nav.budget'),       exact: false, isAdd: false },
  { to: '/more',         icon: Ellipsis,    label: t('nav.more'),         exact: false, isAdd: false },
])
</script>

<style scoped lang="scss">
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(#{$tab-bar-height} + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--color-nav-bg);
  border-top: 1px solid var(--color-nav-border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;

  // Glassmorphism subtil
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1;
    color: var(--color-nav-inactive);
    transition: color $transition-fast;

    &--active {
      color: var(--color-nav-active);
    }

    &--add {
      flex: 1;
      position: relative;
      color: var(--color-nav-add-fg);
      justify-content: center;

      // Le cercle est un pseudo-élément centré dans la colonne
      &::before {
        content: '';
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--color-nav-add-bg);
        transition: opacity $transition-fast, transform $transition-fast;
      }

      & > svg { position: relative; z-index: 1; }

      &:active::before {
        opacity: 0.85;
        transform: scale(0.94);
      }
    }
  }

  &__label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.03em;
  }
}
</style>
