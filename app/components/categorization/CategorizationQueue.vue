<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="queue-fade">
      <div v-if="modelValue" class="cq-backdrop" @click="close" />
    </Transition>

    <!-- Overlay principal -->
    <Transition :name="queueTransition">
      <div v-if="modelValue" class="cq" :class="{ 'cq--modal': isDesktop }">

        <!-- Header -->
        <div class="cq__header">
          <p class="cq__title">{{ $t('categorization.queue.title') }}</p>
          <button class="cq__close" :aria-label="$t('common.close')" @click="close">
            <X :size="18" />
          </button>
        </div>

        <!-- Contenu -->
        <div class="cq__content">

          <!-- Chargement initial -->
          <div v-if="queue.loading.value" class="cq__loading">
            <span class="cq__spinner" />
          </div>

          <template v-else>

            <!-- Progress -->
            <CategorizationProgress
              v-if="!queue.isDone.value"
              :validated="queue.validated.value"
              :total="queue.initialTotal.value"
            />

            <!-- Zone carte -->
            <div class="cq__card-area">

              <!-- État terminé -->
              <CategorizationEmpty
                v-if="queue.isDone.value"
                :all-categorized="queue.allCategorized.value"
                :skipped-count="queue.skippedCount.value"
                :show-recurring="queue.allCategorized.value"
                @close="close"
                @reset="queue.reset()"
                @recurring="goToRecurring"
              />

              <!-- Carte courante -->
              <Transition v-else name="card-enter" mode="out-in">
                <CategorizationCard
                  v-if="queue.current.value"
                  :key="queue.current.value.id"
                  ref="cardRef"
                  :tx="queue.current.value"
                  :suggestion="activeSuggestion"
                  @validate="onCardValidate"
                  @skip="onCardSkip"
                  @pick="pickerOpen = true"
                />
              </Transition>

            </div>

            <!-- Actions (masquées si terminé) -->
            <CategorizationActions
              v-if="!queue.isDone.value && queue.current.value"
              :has-suggestion="!!activeSuggestion"
              :loading="validating"
              @validate="onActionValidate"
              @skip="onActionSkip"
              @pick="pickerOpen = true"
            />

            <!-- Hint swipe (visible seulement les premières fois) -->
            <p v-if="!queue.isDone.value && showSwipeHint" class="cq__hint">
              {{ $t('categorization.queue.swipeHint') }}
            </p>

          </template>

        </div>

      </div>
    </Transition>
  </Teleport>

  <!-- Hors du Teleport : évite que transform/overflow de .cq piège les fixed du drawer -->
  <CategorizationCategoryDrawer
    v-if="modelValue"
    v-model="pickerOpen"
    :initial-type="queue.current.value && queue.current.value.amount > 0 ? 'revenu' : 'depense'"
    @apply="onPickerApply"
  />
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useCategorizationQueue } from '~/composables/useCategorizationQueue'
import { useLocalSuggestion }     from '~/composables/useLocalSuggestion'
import { useToast }               from '~/composables/useToast'
import { scheduleCsvRecurring }   from '~/composables/csvRecurringState'
import { useCategoryStore }       from '~/stores/useCategoryStore'
import type { TransactionType }   from '~/types'

const open = defineModel<boolean>({ required: true })

const { t }         = useI18n()
const toast         = useToast()
const router        = useRouter()
const queue         = useCategorizationQueue()
const { isDesktop } = useBreakpoint()
const categoryStore = useCategoryStore()

function getSubcatName(id: string): string {
  for (const cat of categoryStore.categories) {
    const sub = cat.subcategories.find(s => s.id === id)
    if (sub) return sub.name
  }
  return ''
}

// ─── Suggestion active ────────────────────────────────────────────────────────
// Priorité : manuel > bulk DB (chargé à l'ouverture) > local (mois courant)
const currentName          = computed(() => queue.current.value?.name ?? '')
const { suggestion: localSuggestion } = useLocalSuggestion(currentName)
const manualCategory  = ref<{ category: string; type: TransactionType } | null>(null)

const activeSuggestion = computed(() => {
  const tx = queue.current.value
  if (!tx) return null
  return manualCategory.value
    ?? queue.suggestionsMap.value.get(tx.id)
    ?? localSuggestion.value
})

// ─── Carte ───────────────────────────────────────────────────────────────────
const cardRef   = ref<{ flyRight: () => void; flyLeft: () => void } | null>(null)
const validating = ref(false)

// Reset de la catégorie manuelle à chaque changement de carte
watch(() => queue.current.value?.id, () => {
  manualCategory.value = null
})

// ─── Ouverture / fermeture ───────────────────────────────────────────────────
watch(open, async (v) => {
  if (v) await queue.init()
  else pickerOpen.value = false
})

function close() {
  open.value = false
}

// ─── Swipe hint ──────────────────────────────────────────────────────────────
// Affiché les 3 premières utilisations de la session, jamais sur desktop
const swipeHintCount = ref(0)
const showSwipeHint  = computed(() => !isDesktop.value && swipeHintCount.value < 3)

// ─── Transition ───────────────────────────────────────────────────────────────
const queueTransition = computed(() => isDesktop.value ? 'queue-modal' : 'queue-slide')
watch(() => queue.validated.value, (v) => {
  if (v > 0) swipeHintCount.value++
})

// ─── Validation ──────────────────────────────────────────────────────────────
async function doValidate() {
  const suggestion = activeSuggestion.value
  if (!suggestion || validating.value) return
  validating.value = true
  try {
    await queue.validate(suggestion.category, suggestion.type)
    toast.show(t('categorization.toast.validated', { category: getSubcatName(suggestion.category) }), { type: 'success' })
  } finally {
    validating.value = false
  }
}

// Déclenché par le swipe de la carte → valider
async function onCardValidate() {
  await doValidate()
}

// Déclenché par le bouton Valider → animer la carte d'abord
function onActionValidate() {
  if (!activeSuggestion.value) return
  cardRef.value?.flyRight()
  // La validation se fait dans onCardValidate après l'animation
}

// ─── Skip ────────────────────────────────────────────────────────────────────
function onCardSkip() {
  queue.skip()
}

function onActionSkip() {
  cardRef.value?.flyLeft()
}

// ─── Picker manuel ───────────────────────────────────────────────────────────
const pickerOpen = ref(false)

function onPickerApply(category: string, type: TransactionType) {
  manualCategory.value = { category, type }
  // Valider immédiatement après sélection manuelle
  nextTick(() => cardRef.value?.flyRight())
}

// ─── Recurring post-catégorisation ──────────────────────────────────────────
function goToRecurring() {
  scheduleCsvRecurring()
  open.value = false
  router.push('/more?openCsv=1')
}

// modelValue sync
const modelValue = open
</script>

<style scoped lang="scss">
.cq-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 400;
  backdrop-filter: blur(2px);
}

.cq {
  position: fixed;
  inset: 0;
  z-index: 401;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  // Safe areas iOS
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(env(safe-area-inset-bottom) + 24px);

  // ─── Header ───────────────────────────────────────────────────────────
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px $page-padding-x 0;
    flex-shrink: 0;
  }

  &__title {
    font-family: var(--font-title);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__close {
    @include btn-icon(36px);
    background: var(--color-bg-elevated);
    color: var(--color-text-secondary);
  }

  // ─── Contenu ──────────────────────────────────────────────────────────
  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px $page-padding-x 0;
    overflow: hidden;
  }

  // ─── Zone carte ───────────────────────────────────────────────────────
  &__card-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    // Marge pour que la carte ne touche pas les bords
    margin: 0 4px;
  }

  &__hint {
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
    flex-shrink: 0;
  }

  // ─── Variante modal desktop ────────────────────────────────────────────
  &--modal {
    inset: auto;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(520px, 90vw);
    max-height: 85dvh;
    overflow-y: auto;
    border-radius: var(--radius-xl);
    padding-top: 8px;
    padding-bottom: 24px;
  }

  &__loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__spinner {
    display: block;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent);
    animation: cq-spin 0.7s linear infinite;
  }
}

@keyframes cq-spin {
  to { transform: rotate(360deg); }
}

// ─── Transitions de l'overlay ─────────────────────────────────────────────────
.queue-fade-enter-active,
.queue-fade-leave-active { transition: opacity 250ms ease; }
.queue-fade-enter-from,
.queue-fade-leave-to     { opacity: 0; }

.queue-slide-enter-active { transition: transform 380ms cubic-bezier(0.32, 0.72, 0, 1); }
.queue-slide-leave-active { transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1); }
.queue-slide-enter-from,
.queue-slide-leave-to     { transform: translateY(100%); }

// ─── Transition modal desktop (fade simple) ───────────────────────────────────
.queue-modal-enter-active { transition: opacity 200ms ease; }
.queue-modal-leave-active { transition: opacity 150ms ease; }
.queue-modal-enter-from,
.queue-modal-leave-to { opacity: 0; }

// ─── Transition entre les cartes ─────────────────────────────────────────────
.card-enter-enter-active {
  transition: transform 350ms cubic-bezier(0.34, 1.2, 0.64, 1), opacity 250ms ease;
}
.card-enter-leave-active {
  // La sortie est gérée par l'animation de la carte elle-même (fly-right/left)
  // On cache simplement le composant après un court délai
  transition: opacity 10ms;
}
.card-enter-enter-from {
  transform: translateY(40px) scale(0.94);
  opacity: 0;
}
.card-enter-leave-to {
  opacity: 0;
}
</style>
