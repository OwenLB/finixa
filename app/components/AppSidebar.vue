<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="sidebar__logo">
      <span class="sidebar__logo-text">Finixa</span>
    </div>

    <!-- Bouton ajouter -->
    <button class="sidebar__add" @click="addPanel.openAdd()">
      <Plus :size="16" :stroke-width="2.5" />
      <span>{{ $t('nav.add') }}</span>
      <kbd class="sidebar__kbd">N</kbd>
    </button>

    <!-- Navigation -->
    <nav class="sidebar__nav">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sidebar__item"
        active-class="sidebar__item--active"
        :exact="item.exact"
      >
        <component :is="item.icon" :size="18" :stroke-width="1.75" />
        <span>{{ item.label }}</span>
        <kbd v-if="item.kbd" class="sidebar__kbd">{{ item.kbd }}</kbd>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { LayoutGrid, ReceiptText, Wallet, Ellipsis, Plus } from 'lucide-vue-next'

const { t }    = useI18n()
const addPanel = useAddPanel()

const navItems = computed(() => [
  { to: '/',             icon: LayoutGrid,  label: t('nav.dashboard'),    exact: true,  kbd: undefined },
  { to: '/transactions', icon: ReceiptText, label: t('nav.transactions'), exact: false, kbd: '/'       },
  { to: '/budget',       icon: Wallet,      label: t('nav.budget'),       exact: false, kbd: undefined },
  { to: '/more',         icon: Ellipsis,    label: t('nav.more'),         exact: false, kbd: undefined },
])

useKeyboardShortcuts()
</script>

<style scoped lang="scss">
.sidebar {
  width: $sidebar-width;
  flex-shrink: 0;
  height: 100dvh;
  position: sticky;
  top: 0;
  background: var(--color-bg-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 24px 12px 32px;
  overflow-y: auto;

  &__logo {
    padding: 4px 8px 24px;
  }

  &__logo-text {
    font-family: var(--font-title);
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
  }

  &__add {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    transition: opacity $transition-fast;

    &:hover  { opacity: 0.88; }
    &:active { opacity: 0.75; }

    .sidebar__kbd {
      margin-left: auto;
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
    }
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 500;
    transition: background $transition-fast, color $transition-fast;

    &:hover {
      background: var(--color-bg-elevated);
      color: var(--color-text-primary);

      .sidebar__kbd { opacity: 1; }
    }

    &--active {
      background: var(--color-bg-elevated);
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .sidebar__kbd { margin-left: auto; }
  }

  &__kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 4px;
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
    font-family: var(--font-base);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    opacity: 0;
    transition: opacity $transition-fast;
    flex-shrink: 0;
  }
}
</style>
