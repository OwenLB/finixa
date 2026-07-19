<template>
  <Teleport to="body">
    <Transition name="ctx-backdrop">
      <div v-if="menu.state.visible" class="ctx-backdrop" @click="menu.hide()" />
    </Transition>

    <Transition name="ctx-menu">
      <div
        v-if="menu.state.visible"
        class="ctx-menu"
        :style="menuStyle"
        role="menu"
        @click.stop
      >
        <button
          v-for="item in menu.state.items"
          :key="item.label"
          class="ctx-menu__item"
          :class="{ 'ctx-menu__item--danger': item.danger }"
          role="menuitem"
          @click="run(item)"
        >
          <component :is="item.icon" :size="18" class="ctx-menu__icon" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useContextMenu } from '~/composables/useContextMenu'
import type { ContextMenuItem } from '~/composables/useContextMenu'

const menu = useContextMenu()

const MENU_ITEM_H = 52
const MENU_GAP    = 8

const menuStyle = computed(() => {
  const n       = menu.state.items.length
  const menuH   = n * MENU_ITEM_H + 8
  const viewH   = typeof window !== 'undefined' ? window.innerHeight : 800
  const anchorY = menu.state.anchorY

  const top = anchorY > viewH * 0.55
    ? Math.max(MENU_GAP, anchorY - menuH - MENU_GAP)
    : Math.min(viewH - menuH - MENU_GAP, anchorY + MENU_GAP)

  return { top: `${top}px` }
})

async function run(item: ContextMenuItem) {
  menu.hide()
  await item.action()
}
</script>

<style scoped lang="scss">
.ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
}

.ctx-menu {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 501;
  width: min(280px, 82vw);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 13px 14px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    text-align: left;
    transition: background $transition-fast;

    &:active { background: var(--color-bg-elevated); }

    &--danger {
      color: var(--color-danger);
    }
  }

  &__icon {
    flex-shrink: 0;
    color: var(--color-text-secondary);

    .ctx-menu__item--danger & { color: var(--color-danger); }
  }
}

// ── Transitions ───────────────────────────────────────────────────
.ctx-backdrop-enter-active, .ctx-backdrop-leave-active {
  transition: opacity 150ms ease;
}
.ctx-backdrop-enter-from, .ctx-backdrop-leave-to { opacity: 0; }

.ctx-menu-enter-active { transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 150ms ease; }
.ctx-menu-leave-active { transition: transform 120ms ease, opacity 100ms ease; }
.ctx-menu-enter-from, .ctx-menu-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.9);
}
</style>
