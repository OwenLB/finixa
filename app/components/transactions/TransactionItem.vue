<template>
  <div
    class="tx-swipe"
    :class="{
      'tx-swipe--deleting': deleting,
      'tx-swipe--selected': selectionStore.isSelected(tx.id),
      'tx-swipe--target':   isDropTarget,
    }"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onCancel"
    @click.capture="onCapturingClick"
    @contextmenu.prevent
  >
    <!-- Rail gauche : révélé en swipant à gauche (supprimer) -->
    <div
      class="tx-swipe__rail tx-swipe__rail--left"
      :class="{ 'tx-swipe__rail--committed': deltaX <= -80 }"
      :style="{ opacity: Math.min(1, (-deltaX - 10) / 30) }"
    >
      <div class="tx-swipe__rail-content">
        <span class="tx-swipe__rail-icon"><Trash2 :size="22" /></span>
        <span class="tx-swipe__rail-label">{{ $t('a11y.delete') }}</span>
      </div>
    </div>

    <!-- Rail droit : révélé en swipant à droite (pointer/dépointer) -->
    <div
      class="tx-swipe__rail tx-swipe__rail--right"
      :class="{ 'tx-swipe__rail--committed': deltaX >= 80 }"
      :style="rightRailStyle"
    >
      <div class="tx-swipe__rail-content">
        <span class="tx-swipe__rail-icon"><component :is="statusIcon" :size="22" /></span>
        <span class="tx-swipe__rail-label">{{ tx.status === 'checked' ? $t('contextMenu.unpointer') : $t('contextMenu.pointer') }}</span>
      </div>
    </div>

    <!-- Contenu principal -->
    <div
      class="tx-item"
      :class="{
        'tx-item--selected': selectionStore.isSelected(tx.id),
      }"
      :style="itemStyle"
      @click="onTap"
    >
      <div
        class="tx-item__icon"
        :class="{
          'tx-item__icon--selectable': selectionStore.active,
          'tx-item__icon--selected':   selectionStore.isSelected(tx.id),
        }"
        :style="selectionStore.active ? {} : { background: categoryIcon.iconBg }"
      >
        <template v-if="selectionStore.active">
          <CheckCircle2 v-if="selectionStore.isSelected(tx.id)" :size="20" />
          <Circle v-else :size="20" />
        </template>
        <template v-else>
          <component :is="categoryIcon.icon" :size="18" :color="categoryIcon.iconColor" />
        </template>
      </div>

      <div class="tx-item__info">
        <div class="tx-item__name-row">
          <span class="tx-item__name">{{ tx.name }}</span>
          <RefreshCw v-if="tx.virtual" :size="12" class="tx-item__recurring" />
          <span v-if="tx.horsBudget" class="tx-item__hors-budget-badge">HB</span>
          <span v-if="isIncomplete && !isDesktop" class="tx-item__incomplete-dot" />
          <span v-if="isLate" class="tx-item__late-dot" />
        </div>
        <span
          class="tx-item__category"
          :class="{ 'tx-item__category--uncategorized': isUncategorized }"
        >
          {{ categoryLabel }}
        </span>
      </div>

      <div class="tx-item__right">
        <div class="tx-item__amount-row">
          <span
            class="tx-item__amount"
            :class="tx.amount > 0 ? 'tx-item__amount--positive' : 'tx-item__amount--negative'"
          >
            {{ fmtAmount(tx.amount) }}
          </span>
          <button
            v-if="!selectionStore.active"
            class="tx-item__status-btn"
            :class="`tx-item__status-btn--${tx.status}`"
            :disabled="toggling"
            :aria-label="$t('a11y.toggleStatus')"
            @click.stop="onToggle"
          >
            <component :is="statusIcon" :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, CheckCircle2, Circle, Trash2, Pencil, ListChecks, Copy } from 'lucide-vue-next'
import type { Transaction } from '~/types'
import { getCategoryIcon }   from '~/utils/categoryIcon'
import { useTransactionStore } from '~/stores/useTransactionStore'
import { useCategoryStore }    from '~/stores/useCategoryStore'
import { useSelectionStore }   from '~/stores/useSelectionStore'
import { useToast }            from '~/composables/useToast'
import { useSwipe }            from '~/composables/useSwipe'
import { useLongPress }        from '~/composables/useLongPress'
import { useHaptics }          from '~/composables/useHaptics'
import { useContextMenu }      from '~/composables/useContextMenu'

const props = defineProps<{ tx: Transaction; isDropTarget?: boolean }>()

const { t }          = useI18n()
const store          = useTransactionStore()
const categoryStore  = useCategoryStore()
const selectionStore = useSelectionStore()
const toast          = useToast()
const { isDesktop }  = useBreakpoint()
const addPanel       = useAddPanel()
const haptics        = useHaptics()
const contextMenu    = useContextMenu()

const isUncategorized = computed(() => !props.tx.categorized)

const categoryLabel = computed(() => {
  if (!props.tx.categorized) return t(`types.${props.tx.type}`)
  return categoryStore.subcategoryLookup.get(props.tx.category) ?? ''
})

const isIncomplete = computed(() =>
  props.tx.amount === 0 ||
  !props.tx.date ||
  !props.tx.categorized
)

const isLate = computed(() => {
  if (props.tx.virtual || props.tx.status === 'checked') return false
  const txDate = new Date(props.tx.date.slice(0, 10) + 'T12:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime() - txDate.getTime() > 5 * 24 * 60 * 60 * 1000
})

const toggling     = ref(false)
const deleting     = ref(false)
const categoryIcon = computed(() => getCategoryIcon(props.tx.category, categoryStore.categories))
const statusIcon   = computed(() => props.tx.status === 'checked' ? CheckCircle2 : Circle)

const rightRailStyle = computed(() => {
  const committed = deltaX.value >= 80
  const dim   = props.tx.status === 'checked' ? 'var(--color-swipe-uncheck)'       : 'var(--color-swipe-check)'
  const vivid = props.tx.status === 'checked' ? 'var(--color-swipe-uncheck-vivid)' : 'var(--color-swipe-check-vivid)'
  return {
    opacity:    Math.min(1, (deltaX.value - 10) / 30),
    background: committed ? vivid : dim,
  }
})

// ── Swipe ─────────────────────────────────────────────────────────
const swipe = useSwipe({ threshold: 80, minDrag: 10 })
const { deltaX, isDragging } = swipe

const itemStyle = computed(() => {
  if (deleting.value) {
    return { transform: 'translateX(-110%)', transition: 'transform 0.22s ease-in' }
  }
  if (isDragging.value) {
    return { transform: `translateX(${deltaX.value}px)`, transition: 'none' }
  }
  return { transform: 'translateX(0)', transition: 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)' }
})

// ── Long press ────────────────────────────────────────────────────
const longPress = useLongPress((e: PointerEvent) => {
  blockNextClick.value = true
  haptics.impact('medium')
  contextMenu.show(buildMenuItems(), e.clientY)
}, { delay: 500 })

// ── Click suppression ─────────────────────────────────────────────
const blockNextClick = ref(false)

function onCapturingClick(e: MouseEvent) {
  if (blockNextClick.value) {
    blockNextClick.value = false
    e.stopPropagation()
    e.preventDefault()
  }
}

// ── Event handlers ────────────────────────────────────────────────
function onDown(e: PointerEvent) {
  if (selectionStore.active) return
  swipe.onPointerDown(e)
  longPress.onPointerDown(e)
}

function onMove(e: PointerEvent) {
  if (selectionStore.active) return
  swipe.onPointerMove(e)
  longPress.onPointerMove(e)
}

function onUp(e: PointerEvent) {
  if (selectionStore.active) {
    longPress.reset()
    swipe.reset()
    return
  }

  longPress.cancel()
  const result = swipe.onPointerUp(e)

  if (result === 'left') {
    blockNextClick.value = true
    haptics.impact('heavy')
    void doDelete()
  } else if (result === 'right') {
    blockNextClick.value = true
    haptics.impact('light')
    void onToggle()
  } else if (result === null) {
    // snap back — nothing to do, itemStyle returns to translateX(0)
  }
  swipe.reset()
}

function onCancel() {
  longPress.reset()
  swipe.reset()
}

// ── Actions ───────────────────────────────────────────────────────
function onTap() {
  if (selectionStore.active) {
    selectionStore.toggle(props.tx.id)
    return
  }
  if (isDesktop.value) addPanel.openEdit(props.tx.id)
  else navigateTo(`/edit/${props.tx.id}`)
}

async function onToggle() {
  if (toggling.value) return
  toggling.value = true
  try {
    const tx = await store.toggleStatus(props.tx.id)
    if (!tx) return
    haptics.selection()
    if (tx.status === 'checked') {
      toast.show(t('toast.txChecked'), { sub: tx.name })
    } else {
      toast.show(t('toast.txUnchecked'), { sub: tx.name, type: 'info' })
    }
  } finally {
    toggling.value = false
  }
}

async function doDelete() {
  deleting.value = true
  await new Promise(r => setTimeout(r, 220))
  try {
    await store.remove(props.tx.id)
    toast.show(t('toast.txDeleted'), { sub: props.tx.name })
  } catch {
    deleting.value = false
    toast.show(t('toast.txDeleteError'), { type: 'error' })
  }
}

async function copyAmount() {
  try {
    await navigator.clipboard.writeText(String(Math.abs(props.tx.amount)))
    haptics.selection()
    toast.show(t('toast.amountCopied'), { sub: fmtAmount(props.tx.amount), type: 'info' })
  } catch {
    // clipboard not available
  }
}

function enterSelection() {
  selectionStore.enter()
  selectionStore.toggle(props.tx.id)
  haptics.impact('medium')
}

// ── Context menu ──────────────────────────────────────────────────
function buildMenuItems() {
  return [
    {
      label:  t('a11y.edit'),
      icon:   Pencil,
      action: () => {
        if (isDesktop.value) addPanel.openEdit(props.tx.id)
        else navigateTo(`/edit/${props.tx.id}`)
      },
    },
    {
      label:  props.tx.status === 'checked' ? t('contextMenu.unpointer') : t('contextMenu.pointer'),
      icon:   props.tx.status === 'checked' ? Circle : CheckCircle2,
      action: onToggle,
    },
    {
      label:  t('contextMenu.copyAmount'),
      icon:   Copy,
      action: copyAmount,
    },
    {
      label:  t('contextMenu.select'),
      icon:   ListChecks,
      action: enterSelection,
    },
    {
      label:  t('a11y.delete'),
      icon:   Trash2,
      danger: true,
      action: doDelete,
    },
  ]
}

const { fmtAmount } = useCurrency()
</script>

<style scoped lang="scss">
// ── Wrapper swipeable ──────────────────────────────────────────────
.tx-swipe {
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  & + & {
    border-top: 1px solid var(--color-border-subtle);
  }

  &--selected + &--selected {
    border-top-color: transparent;
  }

  &--target::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-accent);
    z-index: 2;
  }
}

// ── Rails d'action ─────────────────────────────────────────────────
.tx-swipe__rail {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  color: white;
  pointer-events: none;
  overflow: hidden;

  &--left {
    background: var(--color-swipe-delete);
    justify-content: flex-end;
    transition: background 0.12s ease;
    &.tx-swipe__rail--committed { background: var(--color-swipe-delete-vivid); }
  }
  &--right {
    justify-content: flex-start;
    transition: background 0.12s ease;
    // background géré en inline (dépend de tx.status)
  }

  &--committed .tx-swipe__rail-icon { transform: scale(1.25); }

  &-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
  }

  &-icon {
    display: flex;
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }
}

// ── Contenu de l'item ──────────────────────────────────────────────
.tx-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  cursor: pointer;
  background: var(--color-bg);

  @media (min-width: $breakpoint-lg) {
    padding: 10px 8px;
    margin: 0 -8px;
    border-radius: var(--radius-md);

    &:hover { background: var(--color-bg-elevated); }
  }

  &--selected {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding-left: 8px;
    padding-right: 8px;
    margin: 0 -8px;
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background $transition-fast, color $transition-fast;

    &--selectable {
      background: var(--color-bg-elevated);
      color: var(--color-text-muted);
    }

    &--selected {
      background: var(--color-accent);
      color: var(--color-accent-fg);
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  &__name-row {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__recurring {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__hors-budget-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 1px 4px;
    flex-shrink: 0;
  }

  &__incomplete-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f59e0b;
    flex-shrink: 0;
  }

  &__late-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ef4444;
    flex-shrink: 0;
  }

  &__category {
    font-size: 12px;
    color: var(--color-text-muted);

    &--uncategorized { color: #f59e0b; }
  }

  &__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    flex-shrink: 0;
  }

  &__amount-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__amount {
    font-size: 14px;
    font-weight: 700;

    &--positive { color: var(--color-success); }
    &--negative { color: var(--color-text-primary); }
  }

  &__status-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    margin: -4px;
    border-radius: 50%;
    transition: transform $transition-fast, opacity $transition-fast;

    &:active { transform: scale(0.85); }

    &--checked { color: var(--color-success); }
    &--pending { color: var(--color-text-muted); }
  }
}
</style>
