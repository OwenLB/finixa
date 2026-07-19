<template>
  <Teleport to="body">
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast--${t.type}`"
          @click="dismiss(t.id)"
        >
          <div class="toast__content">
            <div class="toast__icon-wrap">
              <component :is="toastIcon(t.type)" :size="16" />
            </div>
            <div class="toast__body">
              <span class="toast__message">{{ t.message }}</span>
              <span v-if="t.sub" class="toast__sub">{{ t.sub }}</span>
            </div>
          </div>

          <div class="toast__progress-track">
            <div
              class="toast__progress-bar"
              :style="{ animationDuration: `${t.duration}ms` }"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircle2, XCircle, Info } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

function toastIcon(type: string) {
  if (type === 'success') return CheckCircle2
  if (type === 'error')   return XCircle
  return Info
}
</script>

<style scoped lang="scss">
.toast-stack {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 12px);
  left: $page-padding-x;
  right: $page-padding-x;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  overflow: hidden;
  border-radius: var(--radius-md);
  backdrop-filter: blur(12px);
  pointer-events: all;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);

  &--success {
    background: color-mix(in srgb, #1a2e1a 92%, transparent);
    border: 1px solid #2d4f2d;
    .toast__icon-wrap   { color: #34d399; }
    .toast__progress-bar { background: #34d399; }
  }

  &--error {
    background: color-mix(in srgb, #2e1a1a 92%, transparent);
    border: 1px solid #4f2d2d;
    .toast__icon-wrap   { color: #f87171; }
    .toast__progress-bar { background: #f87171; }
  }

  &--info {
    background: color-mix(in srgb, var(--color-bg-elevated) 95%, transparent);
    border: 1px solid var(--color-border);
    .toast__icon-wrap   { color: var(--color-accent); }
    .toast__progress-bar { background: var(--color-accent); }
  }

  &__content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px 12px;
  }

  &__icon-wrap {
    flex-shrink: 0;
    display: flex;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__message {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__sub {
    font-size: 12px;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // --- Barre de progression ---
  &__progress-track {
    height: 2px;
    background: rgba(255, 255, 255, 0.06);
  }

  &__progress-bar {
    height: 100%;
    width: 100%;
    transform-origin: left;
    animation: toast-shrink linear forwards;
  }
}

@keyframes toast-shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

// Transition — glisse depuis le haut
.toast-enter-active { transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease; }
.toast-leave-active { transition: transform 200ms ease, opacity 150ms ease; }
.toast-enter-from   { transform: translateY(-20px); opacity: 0; }
.toast-leave-to     { transform: translateY(-8px);  opacity: 0; }
</style>

<style lang="scss">
[data-theme="light"] {
  .toast {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.10);

    &--success {
      background: color-mix(in srgb, #dcfce7 92%, transparent);
      border-color: #86efac;
      .toast__icon-wrap    { color: #16a34a; }
      .toast__progress-bar { background: #16a34a; }
    }

    &--error {
      background: color-mix(in srgb, #fee2e2 92%, transparent);
      border-color: #fca5a5;
      .toast__icon-wrap    { color: #dc2626; }
      .toast__progress-bar { background: #dc2626; }
    }

    &__progress-track {
      background: rgba(0, 0, 0, 0.06);
    }
  }
}
</style>
