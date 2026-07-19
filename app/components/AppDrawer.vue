<template>
  <Teleport to="body">
    <!-- Pas de backdrop pour les panneaux droits desktop (ils poussent le contenu) -->
    <Transition name="drawer-backdrop">
      <div v-if="modelValue && !isRightPanel" class="drawer-backdrop" :style="{ zIndex: backdropZ }" @click="close" />
    </Transition>

    <Transition :name="transitionName">
      <div
        v-if="modelValue"
        ref="drawerRef"
        class="drawer"
        :class="desktopClass"
        :style="{ zIndex: drawerZ }"
        role="dialog"
        aria-modal="true"
        :aria-label="title || undefined"
        tabindex="-1"
        @pointerdown="onDrawerPointerDown"
        @pointermove="onDrawerPointerMove"
        @pointerup="onDrawerPointerUp"
        @pointercancel="() => { swipeActive = false; swipeDragY = 0 }"
      >
        <!-- Mobile: barre de tirage -->
        <div v-if="!isDesktop" class="drawer__handle-bar" :aria-label="$t('common.close')" role="button" tabindex="0" @click="close" @keydown.enter="close" @keydown.space.prevent="close">
          <div class="drawer__handle" />
        </div>

        <!-- Header: toujours visible sur desktop (bouton fermer), conditionnel sur mobile -->
        <div
          v-if="isDesktop || title || $slots.title"
          class="drawer__header"
          :class="{ 'drawer__header--desktop': isDesktop }"
        >
          <slot name="title">
            <span v-if="title" class="drawer__title">{{ title }}</span>
          </slot>
          <button v-if="isDesktop" class="drawer__close" :aria-label="$t('common.close')" @click="close">
            <X :size="18" />
          </button>
        </div>

        <div class="drawer__body">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue:     boolean
  title?:         string
  zIndex?:        number
  desktopVariant?: 'right' | 'center' | 'bottom'
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { isDesktop } = useBreakpoint()
const rightPanel    = useRightPanel()
const drawerRef     = ref<HTMLElement | null>(null)

// ── Swipe-to-close (mobile bottom sheet only) ─────────────────────
const CLOSE_THRESHOLD = 120
let swipeStartY  = 0
let swipeStartX  = 0
let swipePointerId = -1
let swipeDragY   = 0
let swipeActive  = false

function onDrawerPointerDown(e: PointerEvent) {
  if (isDesktop.value || effectiveVariant.value !== 'bottom') return
  swipeStartY    = e.clientY
  swipeStartX    = e.clientX
  swipePointerId = e.pointerId
  swipeActive    = true
  swipeDragY     = 0
}

function onDrawerPointerMove(e: PointerEvent) {
  if (!swipeActive || e.pointerId !== swipePointerId) return
  const dy = e.clientY - swipeStartY
  const dx = e.clientX - swipeStartX

  // Annuler si le geste est clairement horizontal
  if (Math.abs(dx) > Math.abs(dy) + 5) { swipeActive = false; return }

  // Attendre un intent vertical minimal avant d'engager
  if (dy < 8) return

  // Engagé : prévenir le pull-to-refresh natif du navigateur
  e.preventDefault()

  swipeDragY = Math.max(0, dy)
  if (drawerRef.value) {
    drawerRef.value.style.transition = 'none'
    drawerRef.value.style.transform  = `translateY(${swipeDragY}px)`
  }
}

function onDrawerPointerUp(e: PointerEvent) {
  if (!swipeActive || e.pointerId !== swipePointerId) return
  swipeActive = false
  if (swipeDragY >= CLOSE_THRESHOLD) {
    close()
  } else {
    // Snap back
    if (drawerRef.value) {
      drawerRef.value.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
      drawerRef.value.style.transform  = 'translateY(0)'
      const el = drawerRef.value
      setTimeout(() => {
        el.style.transition = ''
        el.style.transform  = ''
      }, 260)
    }
  }
  swipeDragY = 0
}

const backdropZ = computed(() => props.zIndex ?? 300)
const drawerZ   = computed(() => (props.zIndex ?? 300) + 1)

const effectiveVariant = computed(() =>
  isDesktop.value ? (props.desktopVariant ?? 'right') : 'bottom'
)

const transitionName = computed(() => {
  if (!isDesktop.value || effectiveVariant.value === 'bottom') return 'drawer-slide'
  if (effectiveVariant.value === 'center') return 'drawer-fade'
  return 'drawer-slide-right'
})

const desktopClass = computed(() => {
  if (!isDesktop.value) return null
  return `drawer--desktop-${effectiveVariant.value}`
})

function close() {
  emit('update:modelValue', false)
}

// Synchronise le compteur de panneaux droits desktop
const isRightPanel = computed(() => isDesktop.value && effectiveVariant.value === 'right')

watch(
  [isRightPanel, () => props.modelValue],
  ([panel, open], [panelPrev, openPrev]) => {
    const wasPanel = panelPrev && openPrev
    const isNow    = panel    && open
    if (!wasPanel && isNow)  rightPanel.push()
    if (wasPanel  && !isNow) rightPanel.pop()
  },
  { immediate: false },
)

onUnmounted(() => {
  if (isRightPanel.value && props.modelValue) rightPanel.pop()
})

// Dialog accessible : scroll lock du body, focus déplacé dans le drawer puis
// restitué à la fermeture, Escape pour fermer, et piège à focus (Tab cyclique).
function focusableInDrawer(): HTMLElement[] {
  if (!drawerRef.value) return []
  return Array.from(
    drawerRef.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => el.offsetParent !== null)
}

watch(() => props.modelValue, (isOpen, _, onCleanup) => {
  if (!isOpen) return

  const previouslyFocused = document.activeElement as HTMLElement | null
  const prevOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  nextTick(() => {
    const focusables = focusableInDrawer()
    ;(focusables[0] ?? drawerRef.value)?.focus()
  })

  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key !== 'Tab') return
    const focusables = focusableInDrawer()
    if (focusables.length === 0) { e.preventDefault(); return }
    const first = focusables[0]!
    const last  = focusables[focusables.length - 1]!
    const active = document.activeElement as HTMLElement | null
    if (e.shiftKey && (active === first || !drawerRef.value?.contains(active))) {
      e.preventDefault(); last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault(); first.focus()
    }
  }
  document.addEventListener('keydown', handler)

  onCleanup(() => {
    document.removeEventListener('keydown', handler)
    document.body.style.overflow = prevOverflow
    previouslyFocused?.focus?.()
  })
})
</script>

<style scoped lang="scss">
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
}

.drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-bg-surface);
  border-radius: 20px 20px 0 0;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  max-height: 90dvh;
  overflow-y: auto;
  overscroll-behavior: contain;

  // ── Variantes desktop ────────────────────────────────────────
  &--desktop-right {
    top: 0;
    right: 0;
    left: auto;
    bottom: 0;
    width: 480px;
    max-height: none;
    border-radius: var(--radius-lg) 0 0 var(--radius-lg);
    padding-bottom: 32px;
  }

  &--desktop-center {
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    width: min(560px, 90vw);
    max-height: 85dvh;
    transform: translate(-50%, -50%);
    border-radius: var(--radius-xl);
    padding-bottom: 32px;
  }

  // ── Structure interne ─────────────────────────────────────────
  &__handle-bar {
    display: flex;
    justify-content: center;
    padding: 12px 0 8px;
    cursor: pointer;
  }

  &__handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--color-border);
  }

  &__header {
    padding: 4px $page-padding-x 16px;
    border-bottom: 1px solid var(--color-border-subtle);
    margin-bottom: 20px;

    &--desktop {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px $page-padding-x 16px;
    }
  }

  &__title {
    font-family: var(--font-title);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__close {
    @include btn-icon(32px);
    color: var(--color-text-secondary);
    background: var(--color-bg-elevated);
    flex-shrink: 0;

    &:hover { color: var(--color-text-primary); }
  }

  &__body {
    padding: 0 $page-padding-x;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}

// ── Transitions ───────────────────────────────────────────────────

// Mobile — slide du bas
.drawer-backdrop-enter-active, .drawer-backdrop-leave-active { transition: opacity 250ms ease; }
.drawer-backdrop-enter-from,  .drawer-backdrop-leave-to    { opacity: 0; }

.drawer-slide-enter-active { transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1); }
.drawer-slide-leave-active { transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateY(100%); }

// Desktop — slide depuis la droite
.drawer-slide-right-enter-active { transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1); }
.drawer-slide-right-leave-active { transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.drawer-slide-right-enter-from, .drawer-slide-right-leave-to { transform: translateX(100%); }

// Desktop center — fade + scale
.drawer-fade-enter-active { transition: opacity 200ms ease, transform 200ms ease; }
.drawer-fade-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; transform: translate(-50%, -48%); }
</style>
