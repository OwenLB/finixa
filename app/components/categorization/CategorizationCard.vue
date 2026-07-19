<template>
  <div
    ref="cardEl"
    class="cat-card"
    :class="cardClass"
    :style="cardStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onCancel"
    @transitionend="onTransitionEnd"
  >

    <!-- Overlay directionnel : vert (valider) -->
    <div class="cat-card__overlay cat-card__overlay--right" :style="{ opacity: rightOpacity }">
      <CheckCircle2 :size="32" />
      <span>{{ $t('categorization.card.validate') }}</span>
    </div>

    <!-- Overlay directionnel : rouge (passer) -->
    <div class="cat-card__overlay cat-card__overlay--left" :style="{ opacity: leftOpacity }">
      <SkipForward :size="32" />
      <span>{{ $t('categorization.card.skip') }}</span>
    </div>

    <!-- Contenu -->
    <div class="cat-card__body">

      <!-- Icône + montant -->
      <div class="cat-card__top">
        <div class="cat-card__icon-wrap" :style="{ background: categoryIcon.iconBg }">
          <component :is="categoryIcon.icon" :size="22" :color="categoryIcon.iconColor" />
        </div>
        <span
          class="cat-card__amount"
          :class="tx.amount > 0 ? 'cat-card__amount--positive' : 'cat-card__amount--negative'"
        >
          {{ fmtAmount(tx.amount) }}
        </span>
      </div>

      <!-- Nom + date -->
      <div class="cat-card__meta">
        <p class="cat-card__name">{{ tx.name }}</p>
        <p class="cat-card__date">{{ formattedDate }}</p>
      </div>

      <!-- Suggestion / picker -->
      <CategorizationSuggestion
        :suggestion="suggestion"
        @pick="$emit('pick')"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, SkipForward } from 'lucide-vue-next'
import type { Transaction } from '~/types'
import type { LocalSuggestion } from '~/composables/useLocalSuggestion'
import { getCategoryIcon }  from '~/utils/categoryIcon'
import { useCategoryStore } from '~/stores/useCategoryStore'
import { useSwipe }         from '~/composables/useSwipe'

const props = defineProps<{
  tx:         Transaction
  suggestion: LocalSuggestion | null
}>()

const emit = defineEmits<{
  validate: []
  skip:     []
  pick:     []
}>()

const categoryStore = useCategoryStore()
const { fmtAmount } = useCurrency()

// ─── Icône catégorie ─────────────────────────────────────────────────────────
// La transaction n'est pas encore catégorisée → on affiche l'icône fallback
const categoryIcon = computed(() =>
  getCategoryIcon(props.tx.category, categoryStore.categories)
)

// ─── Date formatée ───────────────────────────────────────────────────────────
const formattedDate = computed(() => {
  const d = new Date(props.tx.date)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
})

// ─── Swipe ───────────────────────────────────────────────────────────────────
type CardState = 'idle' | 'dragging' | 'fly-right' | 'fly-left' | 'snap-back'

const cardEl   = ref<HTMLElement | null>(null)
const state    = ref<CardState>('idle')
const swipe    = useSwipe({ threshold: 80 })

// Opacité des overlays directionnel (0→1 sur 80px)
const rightOpacity = computed(() => Math.max(0, Math.min(1, swipe.deltaX.value / 80)))
const leftOpacity  = computed(() => Math.max(0, Math.min(1, -swipe.deltaX.value / 80)))

const cardStyle = computed(() => {
  if (state.value === 'dragging') {
    const dx  = swipe.deltaX.value
    const rot = dx * 0.04          // légère rotation pendant le drag
    return { transform: `translateX(${dx}px) rotate(${rot}deg)` }
  }
  return {}
})

const cardClass = computed(() => ({
  'cat-card--dragging':   state.value === 'dragging',
  'cat-card--fly-right':  state.value === 'fly-right',
  'cat-card--fly-left':   state.value === 'fly-left',
  'cat-card--snap-back':  state.value === 'snap-back',
}))

function onPointerDown(e: PointerEvent) {
  if (state.value !== 'idle') return
  swipe.onPointerDown(e)
  // L'état 'dragging' n'est activé que quand le drag est confirmé (dans onPointerMove)
}

function onPointerMove(e: PointerEvent) {
  const wasDragging = swipe.isDragging.value
  swipe.onPointerMove(e)
  // Passer en mode dragging seulement quand le composable confirme le drag
  if (!wasDragging && swipe.isDragging.value) {
    state.value = 'dragging'
  }
}

function onPointerEnd(e: PointerEvent) {
  const direction = swipe.onPointerUp(e)

  if (direction === 'tap' || state.value !== 'dragging') {
    // Simple tap : ne rien faire, laisser les clics enfants se propager
    state.value = 'idle'
    return
  }

  if (direction === 'right')     flyRight()
  else if (direction === 'left') flyLeft()
  else                           snapBack()
}

function onCancel() {
  swipe.reset()
  if (state.value === 'dragging') snapBack()
  else state.value = 'idle'
}

function snapBack() {
  state.value = 'snap-back'
}

// ─── Animations de sortie ────────────────────────────────────────────────────
function flyRight() {
  swipe.reset()
  state.value = 'fly-right'
}

function flyLeft() {
  swipe.reset()
  state.value = 'fly-left'
}

function onTransitionEnd() {
  if (state.value === 'fly-right') {
    emit('validate')
    // Ne pas resetter l'état : la carte reste translateX(110vw) jusqu'au démontage par Vue.
    // Resetter avant l'emit supprime la classe --fly-right → snap-back visible.
  } else if (state.value === 'fly-left') {
    emit('skip')
  } else if (state.value === 'snap-back') {
    state.value = 'idle'
  }
}

// Exposé pour que le parent puisse déclencher l'animation depuis les boutons
defineExpose({ flyRight, flyLeft })
</script>

<style scoped lang="scss">
.cat-card {
  position: relative;
  background: var(--color-bg-card);
  border-radius: 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
  user-select: none;
  touch-action: pan-y;   // autorise le scroll vertical, bloque le scroll horizontal
  cursor: grab;
  will-change: transform;

  // Pas de transition pendant le drag (fluidité)
  &--dragging { cursor: grabbing; }

  // Transitions de sortie
  &--fly-right {
    transition: transform 360ms cubic-bezier(0.4, 0, 0.8, 1), opacity 300ms ease;
    transform: translateX(110vw) rotate(22deg) !important;
    opacity: 0 !important;
  }

  &--fly-left {
    transition: transform 360ms cubic-bezier(0.4, 0, 0.8, 1), opacity 300ms ease;
    transform: translateX(-110vw) rotate(-22deg) !important;
    opacity: 0 !important;
  }

  // Retour élastique en position
  &--snap-back {
    transition: transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: translateX(0) rotate(0deg) !important;
  }

  // ─── Overlays directionnels ─────────────────────────────────────────────
  &__overlay {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    pointer-events: none;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.03em;

    &--right {
      background: rgba(52, 211, 153, 0.12);
      color: var(--color-success);
    }

    &--left {
      background: rgba(248, 113, 113, 0.12);
      color: var(--color-danger);
    }
  }

  // ─── Contenu ────────────────────────────────────────────────────────────
  &__body {
    padding: 28px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__amount {
    font-size: 26px;
    font-weight: 800;
    font-family: var(--font-title);
    letter-spacing: -0.02em;

    &--positive { color: var(--color-success); }
    &--negative { color: var(--color-text-primary); }
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__name {
    font-size: 20px;
    font-weight: 700;
    font-family: var(--font-title);
    color: var(--color-text-primary);
    line-height: 1.2;
  }

  &__date {
    font-size: 13px;
    color: var(--color-text-muted);
  }
}
</style>
