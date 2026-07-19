<template>
  <MoreSettingsRow
    :label="$t('more.recurring')"
    icon-bg="#818cf820"
    clickable
    chevron
    @click="openRecurringDrawer"
  >
    <template #icon><RefreshCw :size="16" style="color:#818cf8" /></template>
  </MoreSettingsRow>

  <AppDrawer v-model="recurringDrawer" :title="$t('more.recurringTitle')">
    <!-- Bouton détecter les récurrences -->
    <div class="rs__detect-row">
      <button class="rs__detect-btn" @click="detectRecurring">
        <Scan :size="13" />
        {{ $t('more.detectRecurring') }}
      </button>
    </div>

    <div v-if="activeRecurring.length === 0" class="rs__empty">
      {{ $t('more.recurringEmpty') }}
    </div>
    <ul v-else class="rs__list">
      <li
        v-for="rec in activeRecurring"
        :key="rec.id"
        class="rs__item"
      >
        <!-- Icône catégorie -->
        <div class="rs__icon" :style="{ background: catStyle(rec.category).iconBg }">
          <component :is="catStyle(rec.category).icon" :size="16" :color="catStyle(rec.category).iconColor" />
        </div>

        <div class="rs__info">
          <span class="rs__name">{{ rec.name }}</span>
          <span class="rs__meta">
            <span class="rs__cat-name">{{ subcatName(rec.category) }}</span>
            <span v-if="subcatName(rec.category)" class="rs__sep">·</span>
            {{ fmtAmount(rec.amount) }} · {{ $t(`form.frequency${capitalize(rec.frequency)}`) }}
          </span>
        </div>

        <button class="rs__edit-btn" :aria-label="$t('a11y.edit')" @click="openEditRecurring(rec)">
          <Pencil :size="15" />
        </button>
        <button class="rs__delete-btn" :aria-label="$t('a11y.delete')" @click="deleteRecurring(rec)">
          <Trash2 :size="15" />
        </button>
      </li>
    </ul>

    <AppButton @click="openAddRecurring">
      {{ $t('recurring.addTitle') }}
    </AppButton>
  </AppDrawer>

  <RecurringFormDrawer
    v-model="recurringFormOpen"
    :editing-recurring="editingRecurring"
  />
</template>

<script setup lang="ts">
import { RefreshCw, Pencil, Trash2, Scan } from 'lucide-vue-next'
import { getCategoryIcon } from '~/utils/categoryIcon'
import { todayLocalISO }   from '~/utils/localDate'
import { openCsvDrawerForDetection } from '~/composables/csvRecurringState'
import type { RecurringExpense } from '~/types'

const { t }          = useI18n()
const recurringStore = useRecurringStore()
const categoryStore  = useCategoryStore()
const { fmtAmount }  = useCurrency()
const { show }       = useToast()

const recurringDrawer   = ref(false)
const recurringFormOpen = ref(false)
const editingRecurring  = ref<RecurringExpense | null>(null)

const currentMonthStart = todayLocalISO().slice(0, 7) + '-01'

const activeRecurring = computed(() =>
  recurringStore.recurringExpenses.filter(r =>
    r.endDate === null || r.endDate >= currentMonthStart
  )
)

function catStyle(subcatId: string) {
  return getCategoryIcon(subcatId, categoryStore.categories)
}

function subcatName(subcatId: string): string {
  for (const cat of categoryStore.categories) {
    const sub = cat.subcategories.find(s => s.id === subcatId)
    if (sub) return sub.name
  }
  return ''
}

async function openRecurringDrawer() {
  await recurringStore.fetch()
  recurringDrawer.value = true
}

function detectRecurring() {
  recurringDrawer.value = false
  openCsvDrawerForDetection()
}

function openAddRecurring() {
  editingRecurring.value  = null
  recurringFormOpen.value = true
}

function openEditRecurring(rec: RecurringExpense) {
  editingRecurring.value  = rec
  recurringFormOpen.value = true
}

async function deleteRecurring(rec: RecurringExpense) {
  if (!confirm(t('recurring.deleteConfirm', { name: rec.name }))) return
  try {
    await recurringStore.remove(rec.id)
    show(t('recurring.deleteSuccess'), { type: 'success' })
  } catch {
    show(t('recurring.deleteError'), { type: 'error' })
  }
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
</script>

<style scoped lang="scss">
.rs {
  &__detect-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  &__detect-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: 99px;
    transition: background $transition-fast, color $transition-fast;

    &:active {
      background: var(--color-bg-card);
      color: var(--color-text-primary);
    }
  }

  &__empty {
    font-size: 14px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 24px 0;
  }

  &__list {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 0;

    & + & { border-top: 1px solid var(--color-border-subtle); }
  }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    font-size: 12px;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  &__cat-name {
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  &__sep {
    color: var(--color-border);
  }

  &__edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    transition: opacity $transition-fast;

    &:active { opacity: 0.7; }
  }

  &__delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: var(--radius-sm);
    color: #ef4444;
    transition: opacity $transition-fast;

    &:active { opacity: 0.7; }
  }
}
</style>
