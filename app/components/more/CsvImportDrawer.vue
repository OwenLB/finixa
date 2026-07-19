<template>
  <AppDrawer v-model="open" :title="$t('csvImport.title')">

    <!-- ─── Idle : choix du mode d'import ─────────────────── -->
    <template v-if="phase === 'idle'">

      <!-- Sélecteur : IA ou CSV classique -->
      <div v-if="importMode === null" class="cid__chooser">
        <button class="cid__choice cid__choice--ai" @click="importMode = 'ai'">
          <Sparkles :size="22" />
          <span class="cid__choice-label">{{ $t('csvImport.modeAi') }}</span>
          <span class="cid__choice-hint">{{ $t('csvImport.modeAiHint') }}</span>
        </button>
        <button class="cid__choice" @click="importMode = 'classic'">
          <FileUp :size="22" />
          <span class="cid__choice-label">{{ $t('csvImport.modeClassic') }}</span>
          <span class="cid__choice-hint">{{ $t('csvImport.modeClassicHint') }}</span>
        </button>
      </div>

      <!-- Import IA -->
      <MoreAiImportPanel
        v-else-if="importMode === 'ai'"
        :open="open"
        @close="closeDrawer"
        @back="importMode = null"
      />

      <!-- Import CSV classique -->
      <template v-else>
        <button class="cid__dropzone" @click="fileInput?.click()">
          <Upload :size="32" class="cid__upload-icon" />
          <span class="cid__dropzone-label">{{ $t('csvImport.dropzone') }}</span>
          <span class="cid__dropzone-hint">{{ $t('csvImport.dropzoneHint') }}</span>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.txt"
          class="cid__file-input"
          @change="onFileChange"
        />
        <button class="cid__link" @click="importMode = null">{{ $t('aiImport.back') }}</button>
      </template>
    </template>

    <!-- ─── Preview : aperçu avant import ────────────────── -->
    <template v-else-if="phase === 'preview'">
      <div class="cid__file-badge">
        <FileText :size="14" />
        <span>{{ filename }}</span>
      </div>

      <div class="cid__stats">
        <p class="cid__stats-count">{{ parsed.transactions.length }}</p>
        <p class="cid__stats-label">{{ $t('csvImport.transactionsFound') }}</p>
        <div class="cid__stats-breakdown">
          <span>{{ $t('csvImport.depenses', { n: depenseCount }) }}</span>
          <span class="cid__dot">·</span>
          <span>{{ $t('csvImport.revenus', { n: revenuCount }) }}</span>
        </div>
        <p v-if="parsed.skipped" class="cid__stats-skipped">
          {{ $t('csvImport.skipped', { n: parsed.skipped }) }}
        </p>
      </div>

      <button class="cid__btn" @click="startImport">
        {{ $t('csvImport.importBtn') }}
      </button>
      <button class="cid__link" @click="reset">{{ $t('csvImport.cancel') }}</button>
    </template>

    <!-- ─── Importing : barre de progression ─────────────── -->
    <template v-else-if="phase === 'importing'">
      <div class="cid__importing">
        <p class="cid__importing-label">{{ $t('csvImport.importing') }}</p>
        <div class="cid__progress-track">
          <div class="cid__progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <p class="cid__importing-sub">
          {{ $t('csvImport.importingCount', { n: parsed.transactions.length }) }}
        </p>
      </div>
    </template>

    <!-- ─── Done : succès ────────────────────────────────── -->
    <template v-else-if="phase === 'done'">
      <div class="cid__done">
        <div class="cid__done-icon">
          <CheckCircle2 :size="48" />
        </div>
        <p class="cid__done-count">{{ $t('csvImport.done', { n: importedCount }) }}</p>
        <p class="cid__done-sub">{{ $t('csvImport.doneSub') }}</p>
      </div>

      <button class="cid__btn" @click="goToCategorize">
        {{ $t('csvImport.goToCategorize') }}
      </button>

<button class="cid__link" @click="closeDrawer">{{ $t('csvImport.close') }}</button>
    </template>

    <!-- ─── Recurring : détection de récurrences ─────────── -->
    <template v-else-if="phase === 'recurring'">
      <div v-if="detectingHistory && !visibleSuggestions.length" class="cid__rec-loading">
        <Loader2 :size="28" class="cid__rec-loading-spin" />
        <p>{{ $t('csvImport.recurring.detecting') }}</p>
      </div>

      <ImportReviewList
        v-else-if="visibleSuggestions.length"
        :title="$t('csvImport.recurring.title')"
        :subtitle="$t('csvImport.recurring.subtitle', { n: visibleSuggestions.length })"
        :show-accept-all="visibleSuggestions.length > 1"
        :accept-all-disabled="acceptingAll"
        @accept-all="acceptAll"
      >
        <template v-for="s in visibleSuggestions" :key="s.index">
          <!-- ── Mode édition ─────────────────────────────── -->
          <div
            v-if="editingIndex === s.index"
            class="cid__rec-editcard"
            :style="{ borderLeftColor: s.categoryId ? getCatStyle(s.categoryId).iconColor : s.type === 'depense' ? '#ef4444' : 'var(--color-success)' }"
          >
            <div class="cid__rec-editform">
              <input
                v-model="editName"
                class="cid__rec-input"
                :placeholder="$t('csvImport.recurring.editName')"
              />
              <div class="cid__rec-edit-row">
                <input
                  v-model.number="editAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="cid__rec-input cid__rec-input--amount"
                />
                <select v-model="editFrequency" class="cid__rec-select">
                  <option value="weekly">{{ $t('csvImport.recurring.freq.weekly') }}</option>
                  <option value="monthly">{{ $t('csvImport.recurring.freq.monthly') }}</option>
                  <option value="quarterly">{{ $t('csvImport.recurring.freq.quarterly') }}</option>
                  <option value="yearly">{{ $t('csvImport.recurring.freq.yearly') }}</option>
                </select>
              </div>
              <button class="cid__rec-cat-btn" @click="catPickerOpen = true">
                <span v-if="editCategoryId" class="cid__rec-cat-icon" :style="{ background: getCatStyle(editCategoryId).iconBg }">
                  <component :is="getCatStyle(editCategoryId).icon" :size="9" :color="getCatStyle(editCategoryId).iconColor" />
                </span>
                <span class="cid__rec-cat-name">{{ editCategoryId ? getSubcatName(editCategoryId) : $t('csvImport.recurring.chooseCategory') }}</span>
              </button>
              <div class="cid__rec-edit-actions">
                <button class="cid__rec-edit-cancel" @click="cancelEdit">{{ $t('a11y.cancel') }}</button>
                <button class="cid__rec-edit-save" :disabled="!editName.trim()" @click="saveEdit(s.index)">{{ $t('a11y.save') }}</button>
              </div>
            </div>
          </div>

          <!-- ── Mode affichage ───────────────────────────── -->
          <ImportReviewCard
            v-else
            :name="s.displayName"
            :amount="formatSuggestionAmount(s)"
            :amount-type="s.type"
            :category-id="s.categoryId ?? ''"
            :category-label="s.categoryId ? getSubcatName(s.categoryId) : ''"
          >
            <template #lead>
              <ImportReviewActionButton variant="edit" :disabled="acceptingAll" :aria-label="$t('a11y.edit')" @click="startEdit(s)">
                <Pencil :size="14" />
              </ImportReviewActionButton>
            </template>
            <template #indicator>
              <span class="cid__rec-confidence">
                <span v-for="i in 3" :key="i" class="cid__rec-dot" :class="{ 'cid__rec-dot--filled': i <= confidenceDots(s) }" />
              </span>
            </template>
            <template #meta>
              <CalendarDays :size="11" class="cid__rec-cal-icon" />
              <span class="cid__rec-next">{{ formatNextDate(s) }}</span>
              <span class="cid__dot">·</span>
              <span class="cid__rec-freq">{{ $t(`csvImport.recurring.freq.${s.frequency}`) }}</span>
            </template>
            <template #actions>
              <ImportReviewActionButton
                variant="accept"
                :loading="acceptingIndex === s.index"
                :disabled="acceptingIndex === s.index || acceptingAll"
                :aria-label="$t('a11y.validate')"
                @click="acceptSuggestion(s.index)"
              >
                <Check :size="14" />
              </ImportReviewActionButton>
              <ImportReviewActionButton variant="dismiss" :disabled="acceptingAll" :aria-label="$t('a11y.reject')" @click="dismissSuggestion(s.index)">
                <X :size="14" />
              </ImportReviewActionButton>
            </template>
          </ImportReviewCard>
        </template>
      </ImportReviewList>

      <div v-else class="cid__rec-empty">
        <CheckCircle2 :size="36" />
        <p>{{ $t('csvImport.recurring.allDone') }}</p>
      </div>

      <p class="cid__rec-hint">{{ $t('csvImport.recurring.hint') }}</p>

      <button class="cid__link" @click="phase = 'idle'">
        {{ $t('csvImport.recurring.back') }}
      </button>
    </template>

    <!-- ─── Error ─────────────────────────────────────────── -->
    <template v-else-if="phase === 'error'">
      <div class="cid__error">
        <AlertCircle :size="36" />
        <p>{{ errorMsg || $t('csvImport.error') }}</p>
      </div>
      <button class="cid__btn" @click="reset">{{ $t('csvImport.retry') }}</button>
    </template>

    <!-- Sélecteur de catégorie pour l'édition d'une suggestion -->
    <CategorizationCategoryDrawer
      v-model="catPickerOpen"
      :initial-type="editType"
      :initial-category="editSel.category"
      :initial-category-id="editSel.categoryId"
      :initial-subcategory="editSel.subcategory"
      :initial-subcategory-id="editSel.subcategoryId"
      @apply="onCatApply"
    />

  </AppDrawer>
</template>

<script setup lang="ts">
import { Upload, FileText, CheckCircle2, AlertCircle, Check, X, CalendarDays, Sparkles, FileUp, Pencil, Loader2 } from 'lucide-vue-next'
import { ref, watch, computed } from 'vue'
import ImportReviewCard from '~/components/import/ReviewCard.vue'
import ImportReviewActionButton from '~/components/import/ReviewActionButton.vue'
import ImportReviewList from '~/components/import/ReviewList.vue'
import type { TransactionType, RecurringFrequency } from '~/types'
import { useCsvImport }      from '~/composables/useCsvImport'
import { useCategoryStore }  from '~/stores/useCategoryStore'
import { getCategoryIcon }   from '~/utils/categoryIcon'
import type { RecurringSuggestion } from '~/utils/detectRecurring'
import { nextOccurrenceDate } from '~/utils/detectRecurring'
import { formatCurrency }    from '~/utils/formatCurrency'

const open = defineModel<boolean>({ required: true })

const {
  phase, filename, parsed, importedCount, errorMsg, progressPct, fileInput,
  depenseCount, revenuCount,
  visibleSuggestions, acceptingIndex, acceptingAll, detectingHistory,
  onFileChange, startImport, dismissSuggestion, updateSuggestion, acceptSuggestion, acceptAll,
  goToCategorize, closeDrawer, reset,
} = useCsvImport(open)

const currencyStore  = useCurrencyStore()
const categoryStore  = useCategoryStore()

// Mode d'import sélectionné à l'étape idle : null (choix), 'ai' ou 'classic'
const importMode = ref<null | 'ai' | 'classic'>(null)
watch(open, (v) => { if (!v) { importMode.value = null; editingIndex.value = null } })

// ─── Édition d'une suggestion de récurrence ─────────────────────────────────
const editingIndex   = ref<number | null>(null)
const editName       = ref('')
const editAmount     = ref(0)
const editCategoryId = ref('')
const editType       = ref<TransactionType>('depense')
const editFrequency  = ref<RecurringFrequency>('monthly')
const catPickerOpen  = ref(false)

function startEdit(s: RecurringSuggestion & { index: number }) {
  editingIndex.value   = s.index
  editName.value       = s.displayName
  editAmount.value     = Math.abs(s.amount)
  editCategoryId.value = s.categoryId ?? ''
  editType.value       = s.type
  editFrequency.value  = s.frequency
}

function cancelEdit() {
  editingIndex.value = null
}

function saveEdit(index: number) {
  const name = editName.value.trim()
  if (!name) return
  const signed = editType.value === 'depense'
    ? -Math.abs(editAmount.value)
    : Math.abs(editAmount.value)
  updateSuggestion(index, {
    displayName: name,
    amount:      signed,
    type:        editType.value === 'epargne' ? 'depense' : editType.value,
    frequency:   editFrequency.value,
    categoryId:  editCategoryId.value || null,
    categorized: !!editCategoryId.value,
  })
  editingIndex.value = null
}

function onCatApply(categoryId: string, type: TransactionType) {
  editCategoryId.value = categoryId
  editType.value       = type
}

// Sélection courante (pour pré-remplir le sélecteur de catégorie à l'édition)
const editSel = computed(() => {
  for (const cat of categoryStore.categories) {
    if (cat.id === editCategoryId.value) {
      return { category: cat.name, categoryId: cat.id, subcategory: '', subcategoryId: '' }
    }
    const sub = cat.subcategories.find(s => s.id === editCategoryId.value)
    if (sub) return { category: cat.name, categoryId: cat.id, subcategory: sub.name, subcategoryId: sub.id }
  }
  return { category: '', categoryId: '', subcategory: '', subcategoryId: '' }
})

function getCatStyle(subcatId: string) {
  return getCategoryIcon(subcatId, categoryStore.categories)
}

function getSubcatName(subcatId: string): string {
  for (const cat of categoryStore.categories) {
    const sub = cat.subcategories.find(s => s.id === subcatId)
    if (sub) return sub.name
  }
  return ''
}

function formatSuggestionAmount(s: RecurringSuggestion): string {
  const formatted = formatCurrency(Math.abs(s.amount), currencyStore.currency)
  return s.type === 'depense' ? `− ${formatted}` : `+ ${formatted}`
}

function formatNextDate(s: RecurringSuggestion): string {
  const dateStr = nextOccurrenceDate(s.lastDate, s.frequency, s.dayOfMonth)
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function confidenceDots(s: RecurringSuggestion): number {
  return s.confidence === 'high' ? 3 : 2
}
</script>

<style scoped lang="scss">
.cid {

  // ─── Dropzone ───────────────────────────────────────────
  &__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 40px 20px;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
    transition: border-color $transition-fast, background $transition-fast;

    &:active {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    }
  }

  &__upload-icon { color: var(--color-accent); }

  &__dropzone-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__dropzone-hint {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  &__file-input { display: none; }

  // ─── Chooser (IA / CSV) ─────────────────────────────────
  &__chooser {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__choice {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
    padding: 16px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
    text-align: left;
    transition: border-color $transition-fast, background $transition-fast;

    &:active {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    }

    &--ai {
      color: var(--color-accent);
      border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
      background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    }
  }

  &__choice-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__choice-hint {
    font-size: 12px;
    color: var(--color-text-muted);
  }

// ─── File badge ─────────────────────────────────────────
  &__file-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-subtle);

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  // ─── Stats (preview) ────────────────────────────────────
  &__stats {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 24px 0 16px;
  }

  &__stats-count {
    font-family: var(--font-title);
    font-size: 56px;
    font-weight: 800;
    line-height: 1;
    color: var(--color-text-primary);
    letter-spacing: -0.03em;
  }

  &__stats-label {
    font-size: 14px;
    color: var(--color-text-muted);
    margin-bottom: 8px;
  }

  &__stats-breakdown {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  &__dot { color: var(--color-border); }

  &__stats-skipped {
    margin-top: 4px;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  // ─── Buttons ────────────────────────────────────────────
  &__btn {
    @include btn-action;
  }

  &__link {
    width: 100%;
    text-align: center;
    font-size: 14px;
    color: var(--color-text-muted);
    padding: 4px;
    transition: color $transition-fast;
    &:active { color: var(--color-text-secondary); }
  }

  // ─── Importing ──────────────────────────────────────────
  &__importing {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 24px 0;
  }

  &__importing-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
    text-align: center;
  }

  &__importing-sub {
    font-size: 13px;
    color: var(--color-text-muted);
    text-align: center;
  }

  &__progress-track {
    width: 100%;
    height: 8px;
    background: var(--color-bg-elevated);
    border-radius: 99px;
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background: var(--color-accent);
    border-radius: inherit;
    transition: width 0.1s linear;
  }

  // ─── Done ───────────────────────────────────────────────
  &__done {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 0 24px;
  }

  &__done-icon {
    color: var(--color-success);
    margin-bottom: 4px;
  }

  &__done-count {
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary);
    text-align: center;
  }

  &__done-sub {
    font-size: 14px;
    color: var(--color-text-muted);
    text-align: center;
  }

  &__done-recurring-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 20%, transparent);
    border-radius: var(--radius-md);
    transition: background $transition-fast;

    &:active {
      background: color-mix(in srgb, var(--color-accent) 16%, transparent);
    }
  }

  // ─── Recurring phase ────────────────────────────────────
  // Carte en mode édition (le mode affichage utilise ImportReviewCard)
  &__rec-editcard {
    padding: 12px 14px;
    border: 1px solid var(--color-border-subtle);
    border-left: 3px solid transparent;
    border-radius: var(--radius-md);
  }

  &__rec-cat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  &__rec-cat-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__rec-cal-icon {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__rec-next {
    font-size: 12px;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__rec-freq {
    font-size: 12px;
    color: var(--color-text-secondary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__rec-confidence {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0; // ne se compresse jamais — les dots restent visibles
  }

  &__rec-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-border);

    &--filled { background: var(--color-accent); }
  }

  // ─── Édition d'une suggestion ───────────────────────────
  &__rec-editform {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__rec-edit-row {
    display: flex;
    gap: 8px;
  }

  &__rec-input {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--color-text-primary);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);

    &:focus { outline: none; border-color: var(--color-accent); }
    &--amount { flex: 1; font-variant-numeric: tabular-nums; }
  }

  &__rec-select {
    flex: 1;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--color-text-primary);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);

    &:focus { outline: none; border-color: var(--color-accent); }
  }

  &__rec-cat-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);

    &:active { background: color-mix(in srgb, var(--color-text-muted) 8%, transparent); }
  }

  &__rec-edit-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }

  &__rec-edit-cancel {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-muted);
    padding: 8px 12px;
    transition: color $transition-fast;
    &:active { color: var(--color-text-secondary); }
  }

  &__rec-edit-save {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-accent-fg);
    background: var(--color-accent);
    padding: 8px 16px;
    border-radius: var(--radius-md);
    transition: opacity $transition-fast;
    &:disabled { opacity: 0.4; pointer-events: none; }
    &:active { opacity: 0.8; }
  }

  &__rec-hint {
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 4px 0 6px;
  }

  &__rec-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 32px 0 16px;
    color: var(--color-success);

    p {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  &__rec-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 36px 0;
    color: var(--color-text-secondary);

    p { font-size: 14px; }
  }

  &__rec-loading-spin {
    color: var(--color-accent);
    animation: spin 0.7s linear infinite;
  }

  // ─── Error ──────────────────────────────────────────────
  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 0;
    color: #ef4444;
    text-align: center;

    p {
      font-size: 14px;
      color: var(--color-text-secondary);
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
