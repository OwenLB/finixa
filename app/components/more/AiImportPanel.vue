<template>
  <div class="aip">

    <!-- ─── Step 1 : génération du prompt ───────────────────── -->
    <template v-if="phase === 'prompt'">
      <div class="aip__intro">
        <Sparkles :size="22" class="aip__intro-icon" />
        <p class="aip__intro-text">{{ $t('aiImport.promptIntro') }}</p>
      </div>

      <ol class="aip__steps">
        <li>{{ $t('aiImport.step1') }}</li>
        <li>{{ $t('aiImport.step2') }}</li>
        <li>{{ $t('aiImport.step3') }}</li>
      </ol>

      <div class="aip__prompt-box">
        <pre class="aip__prompt">{{ prompt }}</pre>
      </div>

      <button class="aip__btn" @click="copyPrompt">
        <Check v-if="promptCopied" :size="16" />
        <Copy v-else :size="16" />
        {{ promptCopied ? $t('aiImport.copied') : $t('aiImport.copyPrompt') }}
      </button>
      <button class="aip__link" @click="phase = 'paste'">
        {{ $t('aiImport.gotResult') }}
      </button>
      <button class="aip__link aip__link--muted" @click="$emit('back')">
        {{ $t('aiImport.back') }}
      </button>
    </template>

    <!-- ─── Step 2 : coller / uploader la réponse ───────────── -->
    <template v-else-if="phase === 'paste'">
      <p class="aip__paste-label">{{ $t('aiImport.pasteLabel') }}</p>
      <textarea
        v-model="rawInput"
        class="aip__textarea"
        :placeholder="$t('aiImport.pastePlaceholder')"
        rows="8"
      />

      <div class="aip__or">{{ $t('aiImport.or') }}</div>

      <button class="aip__dropzone" @click="fileInput?.click()">
        <Upload :size="20" />
        <span>{{ $t('aiImport.uploadJson') }}</span>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,.txt,application/json"
        class="aip__file-input"
        @change="onFileChange"
      />

      <button class="aip__btn" :disabled="!rawInput.trim()" @click="parseInput">
        {{ $t('aiImport.analyze') }}
      </button>
      <button class="aip__link aip__link--muted" @click="phase = 'prompt'">
        {{ $t('aiImport.back') }}
      </button>
    </template>

    <!-- ─── Step 3 : review ─────────────────────────────────── -->
    <template v-else-if="phase === 'review'">
      <ImportReviewList
        :title="$t('aiImport.reviewTitle', { n: visible.length })"
        :subtitle="reviewCount ? $t('aiImport.reviewHint', { n: reviewCount }) : `${$t('csvImport.depenses', { n: depenseCount })} · ${$t('csvImport.revenus', { n: revenuCount })}`"
        :subtitle-warn="!!reviewCount"
        :show-accept-all="visible.length > 1"
        :accept-all-disabled="acceptingAll"
        @accept-all="importAll"
      >
        <!-- Tri & recherche -->
        <template #toolbar>
          <div class="aip__toolbar">
            <div class="aip__search">
              <Search :size="14" class="aip__search-icon" />
              <input
                v-model="search"
                class="aip__search-input"
                :placeholder="$t('aiImport.searchPlaceholder')"
              />
              <button v-if="search" class="aip__search-clear" :aria-label="$t('a11y.clear')" @click="search = ''">
                <X :size="13" />
              </button>
            </div>
            <div class="aip__sort">
              <button
                class="aip__sort-chip"
                :class="{ 'aip__sort-chip--active': sortField === 'confidence' }"
                @click="toggleSort('confidence')"
              >
                {{ $t('aiImport.sortConfidence') }}
                <component :is="sortDir === 'asc' ? ArrowUp : ArrowDown" v-if="sortField === 'confidence'" :size="12" />
              </button>
              <button
                class="aip__sort-chip"
                :class="{ 'aip__sort-chip--active': sortField === 'date' }"
                @click="toggleSort('date')"
              >
                {{ $t('aiImport.sortDate') }}
                <component :is="sortDir === 'asc' ? ArrowUp : ArrowDown" v-if="sortField === 'date'" :size="12" />
              </button>
            </div>
          </div>
          <p v-if="skipped" class="aip__rev-skipped">{{ $t('csvImport.skipped', { n: skipped }) }}</p>
        </template>

        <ImportReviewCard
          v-for="tx in displayed"
          :key="tx.index"
          :name="tx.name"
          :amount="formatAmount(tx)"
          :amount-type="tx.type"
          :category-id="tx.category"
          :category-label="tx.categoryLabel || $t('aiImport.noCategory')"
          :missing="!tx.category"
        >
          <template #lead>
            <ImportReviewActionButton variant="edit" :disabled="acceptingAll" :aria-label="$t('a11y.edit')" @click="openEditor(tx)">
              <Pencil :size="16" />
            </ImportReviewActionButton>
          </template>
          <template v-if="tx.needsReview" #indicator>
            <span class="aip__badge"><Flag :size="10" /> {{ Math.round(tx.confidence * 100) }}%</span>
          </template>
          <template #meta>
            <span>{{ formatDate(tx.date) }}</span>
          </template>
          <template #actions>
            <ImportReviewActionButton
              variant="accept"
              :loading="acceptingIndex === tx.index"
              :disabled="acceptingAll"
              :aria-label="$t('a11y.validate')"
              @click="acceptOne(tx.index)"
            >
              <Check :size="15" />
            </ImportReviewActionButton>
            <ImportReviewActionButton
              variant="dismiss"
              :disabled="acceptingAll"
              :aria-label="$t('a11y.reject')"
              @click="dismiss(tx.index)"
            >
              <X :size="15" />
            </ImportReviewActionButton>
          </template>
        </ImportReviewCard>

        <p v-if="!displayed.length" class="aip__no-results">{{ $t('aiImport.noResults') }}</p>
      </ImportReviewList>

      <div class="aip__footer">
        <button class="aip__cancel" @click="reset">
          <X :size="15" />
          {{ $t('aiImport.cancelImport') }}
        </button>
      </div>
    </template>

    <!-- ─── Done ────────────────────────────────────────────── -->
    <template v-else-if="phase === 'done'">
      <div class="aip__done">
        <CheckCircle2 :size="48" class="aip__done-icon" />
        <p class="aip__done-count">{{ $t('csvImport.done', { n: importedCount }) }}</p>
        <p class="aip__done-sub">{{ $t('aiImport.doneSub', { n: categorizedCount }) }}</p>
      </div>
      <button v-if="importedCount > categorizedCount" class="aip__btn" @click="goToCategorize">
        {{ $t('csvImport.goToCategorize') }}
      </button>
      <button class="aip__link" @click="$emit('close')">{{ $t('csvImport.close') }}</button>
    </template>

    <!-- ─── Error ───────────────────────────────────────────── -->
    <template v-else-if="phase === 'error'">
      <div class="aip__error">
        <AlertCircle :size="36" />
        <p>{{ errorMsg }}</p>
      </div>
      <button class="aip__btn" @click="phase = 'paste'">{{ $t('csvImport.retry') }}</button>
    </template>

    <!-- Drawer d'édition de catégorie (pré-rempli avec la sélection courante) -->
    <CategorizationCategoryDrawer
      v-model="editorOpen"
      :initial-type="editingType"
      :initial-category="editingCategory"
      :initial-category-id="editingCategoryId"
      :initial-subcategory="editingSubcategory"
      :initial-subcategory-id="editingSubcategoryId"
      @apply="applyCategory"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Sparkles, Copy, Check, Upload, AlertCircle, CheckCircle2, Pencil, X, Search, Flag, ArrowUp, ArrowDown } from 'lucide-vue-next'
import { useAiImport } from '~/composables/useAiImport'
import { useCategoryStore } from '~/stores/useCategoryStore'
import { formatCurrency } from '~/utils/formatCurrency'
import ImportReviewCard from '~/components/import/ReviewCard.vue'
import ImportReviewActionButton from '~/components/import/ReviewActionButton.vue'
import ImportReviewList from '~/components/import/ReviewList.vue'
import type { AiParsedTransaction } from '~/utils/parseAiImport'
import type { TransactionType } from '~/types'

const props = defineProps<{ open: boolean }>()
const emit  = defineEmits<{ close: []; back: [] }>()

const {
  phase, rawInput, errorMsg, skipped, importedCount, categorizedCount, promptCopied,
  prompt, visible, displayed, search, sortField, sortDir, toggleSort, reviewCount, depenseCount, revenuCount,
  acceptingIndex, acceptingAll,
  copyPrompt, parseInput, onFileChange, setCategory, acceptOne, dismiss, importAll, reset,
} = useAiImport()

const currencyStore = useCurrencyStore()
const categoryStore = useCategoryStore()
const router        = useRouter()

const fileInput = ref<HTMLInputElement | null>(null)

// ─── Édition inline de la catégorie ─────────────────────────────
const editorOpen           = ref(false)
const editingIndex         = ref<number | null>(null)
const editingType          = ref<TransactionType>('depense')
const editingCategory      = ref('')
const editingCategoryId    = ref('')
const editingSubcategory   = ref('')
const editingSubcategoryId = ref('')

/** Résout la sélection (catégorie/sous-catégorie) à partir d'un id stocké. */
function resolveSelection(id: string) {
  for (const cat of categoryStore.categories) {
    if (cat.id === id) return { category: cat.name, categoryId: cat.id, subcategory: '', subcategoryId: '' }
    const sub = cat.subcategories.find(s => s.id === id)
    if (sub) return { category: cat.name, categoryId: cat.id, subcategory: sub.name, subcategoryId: sub.id }
  }
  return { category: '', categoryId: '', subcategory: '', subcategoryId: '' }
}

function openEditor(tx: AiParsedTransaction & { index: number }) {
  editingIndex.value = tx.index
  editingType.value  = tx.type
  const sel = resolveSelection(tx.category)
  editingCategory.value      = sel.category
  editingCategoryId.value    = sel.categoryId
  editingSubcategory.value   = sel.subcategory
  editingSubcategoryId.value = sel.subcategoryId
  editorOpen.value = true
}

function applyCategory(categoryId: string, type: TransactionType) {
  if (editingIndex.value === null) return
  setCategory(editingIndex.value, categoryId, type)
  editingIndex.value = null
}

function formatAmount(tx: AiParsedTransaction): string {
  const formatted = formatCurrency(Math.abs(tx.amount), currencyStore.currency)
  return tx.type === 'depense' ? `− ${formatted}` : `+ ${formatted}`
}

function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function goToCategorize() {
  emit('close')
  router.push('/transactions?queue=open')
}

// Réinitialise quand le drawer parent se ferme
watch(() => props.open, (v) => { if (!v) reset() })
</script>

<style scoped lang="scss">
.aip {
  display: flex;
  flex-direction: column;
  gap: 14px;

  // ─── Intro ────────────────────────────────────────────
  &__intro {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  &__intro-icon { color: var(--color-accent); flex-shrink: 0; margin-top: 2px; }
  &__intro-text {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__steps {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--color-text-secondary);
    li { line-height: 1.4; }
  }

  &__prompt-box {
    max-height: 180px;
    overflow-y: auto;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    padding: 12px;
  }
  &__prompt {
    margin: 0;
    font-family: monospace;
    font-size: 11px;
    line-height: 1.5;
    color: var(--color-text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  // ─── Paste ────────────────────────────────────────────
  &__paste-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  &__textarea {
    width: 100%;
    resize: vertical;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
    color: var(--color-text-primary);
    line-height: 1.5;
    &:focus { outline: none; border-color: var(--color-accent); }
  }
  &__or {
    text-align: center;
    font-size: 12px;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }
  &__dropzone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 16px;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
    font-size: 13px;
    &:active { border-color: var(--color-accent); }
  }
  &__file-input { display: none; }

  // ─── Buttons / links ──────────────────────────────────
  &__btn {
    @include btn-action;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    &:disabled { opacity: 0.35; pointer-events: none; }
  }
  &__link {
    width: 100%;
    text-align: center;
    font-size: 14px;
    color: var(--color-accent);
    padding: 4px;
    &--muted { color: var(--color-text-muted); }
    &:active { opacity: 0.7; }
  }

  &__rev-skipped { font-size: 12px; color: var(--color-text-muted); }

  // ─── Toolbar (tri / recherche) ────────────────────────
  &__toolbar {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  &__search {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }
  &__search-icon { color: var(--color-text-muted); flex-shrink: 0; }
  &__search-input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    font-size: 13px;
    color: var(--color-text-primary);
    &:focus { outline: none; }
  }
  &__search-clear { color: var(--color-text-muted); flex-shrink: 0; display: flex; }

  &__sort {
    display: flex;
    gap: 6px;
  }
  &__sort-chip {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 7px 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: 99px;
    transition: background $transition-fast, color $transition-fast, border-color $transition-fast;

    &--active {
      color: var(--color-accent-fg);
      background: var(--color-accent);
      border-color: var(--color-accent);
    }
  }

  // Indicateur "à vérifier" — indigo + icône (slot des cartes partagées)
  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    color: #818cf8;
    background: color-mix(in srgb, #818cf8 14%, transparent);
    padding: 2px 7px;
    border-radius: 99px;
  }

  &__no-results {
    font-size: 13px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 20px 0;
  }

  // ─── Footer ───────────────────────────────────────────
  &__footer {
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border-subtle);
  }
  &__cancel {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 11px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    transition: background $transition-fast;
    &:active { background: color-mix(in srgb, var(--color-text-muted) 10%, transparent); }
  }

  // ─── Done / Error ─────────────────────────────────────
  &__done {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 0 8px;
  }
  &__done-icon { color: var(--color-success); }
  &__done-count {
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
    text-align: center;
  }
  &__done-sub { font-size: 14px; color: var(--color-text-muted); text-align: center; }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 0;
    color: #ef4444;
    text-align: center;
    p { font-size: 14px; color: var(--color-text-secondary); }
  }
}
</style>
