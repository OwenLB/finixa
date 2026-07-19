<template>
  <AppDrawer v-model="open" :title="isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'">

    <AppLockedBanner :locked="isLocked" />

    <!-- Prévisualisation -->
    <div class="cdr__preview">
      <div class="cdr__preview-icon" :style="{ background: color + '28' }">
        <component :is="getIcon(iconKey)" :size="20" :style="{ color }" />
      </div>
      <span class="cdr__preview-name">{{ name || 'Nom de la catégorie' }}</span>
    </div>

    <AppFormField label="Nom">
      <AppInput
        ref="inputRef"
        v-model="name"
        :disabled="isLocked"
        placeholder="Ex: Alimentation"
        @keydown.enter="save"
      />
    </AppFormField>

    <!-- Section couleur collapsible -->
    <div class="cdr__color-section">
      <button class="cdr__color-header" :disabled="isLocked" @click="paletteOpen = !paletteOpen">
        <span class="cdr__color-label">COULEUR</span>
        <div class="cdr__color-header-right">
          <span class="cdr__color-dot" :style="{ background: color }" />
          <ChevronDown :size="13" class="cdr__chevron" :class="{ 'cdr__chevron--open': paletteOpen }" />
        </div>
      </button>

      <div v-show="paletteOpen" class="cdr__palette">

        <!-- Groupes prédéfinis -->
        <div v-for="group in paletteGroups" :key="group.label" class="cdr__group">
          <span class="cdr__group-label">{{ group.label }}</span>
          <div class="cdr__swatches">
            <button
              v-for="c in group.colors"
              :key="c"
              class="cdr__swatch"
              :class="{ 'cdr__swatch--selected': color === c }"
              :style="{ background: c }"
              :disabled="isLocked"
              :aria-label="$t('a11y.selectColor')"
              @click="color = c"
            >
              <Check v-if="color === c" :size="11" color="white" />
            </button>
          </div>
        </div>

        <!-- Personnalisé -->
        <div class="cdr__group">
          <span class="cdr__group-label">Personnalisé</span>
          <div class="cdr__swatches cdr__swatches--custom">
            <label
              class="cdr__swatch cdr__swatch--picker"
              :class="{ 'cdr__swatch--selected': isCustomColor }"
              :style="isCustomColor ? { background: color } : {}"
              :aria-disabled="isLocked || undefined"
            >
              <input
                type="color"
                class="cdr__hidden-color"
                :value="color"
                :disabled="isLocked"
                @input="onColorPicker"
              />
              <Check v-if="isCustomColor" :size="11" color="white" />
            </label>
            <input
              type="text"
              class="cdr__hex"
              :value="hexInput"
              maxlength="7"
              placeholder="#rrggbb"
              spellcheck="false"
              :disabled="isLocked"
              @input="onHexInput"
              @focus="hexInput = color"
            />
          </div>
        </div>

      </div>
    </div>

    <!-- Section icône collapsible -->
    <div class="cdr__color-section">
      <button class="cdr__color-header" :disabled="isLocked" @click="iconsOpen = !iconsOpen">
        <span class="cdr__color-label">ICÔNE</span>
        <div class="cdr__color-header-right">
          <component :is="getIcon(iconKey)" :size="15" :style="{ color }" />
          <ChevronDown :size="13" class="cdr__chevron" :class="{ 'cdr__chevron--open': iconsOpen }" />
        </div>
      </button>

      <div v-show="iconsOpen" class="cdr__icon-panel">
        <!-- Recherche -->
        <div class="cdr__icon-search">
          <Search :size="14" class="cdr__icon-search-ico" />
          <input
            v-model="iconSearch"
            type="search"
            class="cdr__icon-search-input"
            placeholder="Rechercher une icône…"
            :disabled="isLocked"
          />
        </div>

        <!-- Résultats filtrés -->
        <template v-if="iconSearch.trim()">
          <div v-if="filteredIconKeys.length" class="cdr__icons">
            <button
              v-for="key in filteredIconKeys"
              :key="key"
              class="cdr__icon-btn"
              :class="{ 'cdr__icon-btn--selected': iconKey === key }"
              :style="iconKey === key ? { background: color + '28', color } : {}"
              :disabled="isLocked"
              @click="iconKey = key"
            >
              <component :is="getIcon(key)" :size="17" />
            </button>
          </div>
          <p v-else class="cdr__icon-empty">Aucun résultat</p>
        </template>

        <!-- Groupes -->
        <template v-else>
          <div v-for="group in ICON_GROUPS" :key="group.label" class="cdr__icon-group">
            <span class="cdr__group-label">{{ group.label }}</span>
            <div class="cdr__icons">
              <button
                v-for="key in group.keys"
                :key="key"
                class="cdr__icon-btn"
                :class="{ 'cdr__icon-btn--selected': iconKey === key }"
                :style="iconKey === key ? { background: color + '28', color } : {}"
                :disabled="isLocked"
                @click="iconKey = key"
              >
                <component :is="getIcon(key)" :size="17" />
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Toggle catégorie variable -->
    <div class="cdr__variable-row">
      <div class="cdr__variable-info">
        <span class="cdr__variable-label">Catégorie variable</span>
        <span class="cdr__variable-hint">Dépenses imprévisibles (courses, restaurants…)</span>
      </div>
      <button
        class="cdr__toggle"
        :class="{ 'cdr__toggle--on': isVariable }"
        :disabled="isLocked"
        role="switch"
        :aria-checked="isVariable"
        @click="isVariable = !isVariable"
      >
        <span class="cdr__toggle-thumb" />
      </button>
    </div>

    <!-- Toggle exclu des calculs (ex: désépargne) -->
    <div class="cdr__variable-row">
      <div class="cdr__variable-info">
        <span class="cdr__variable-label">Exclure des calculs</span>
        <span class="cdr__variable-hint">Reste visible mais hors jauge, budget, prévisionnel et score (ex: virement depuis l'épargne)</span>
      </div>
      <button
        class="cdr__toggle"
        :class="{ 'cdr__toggle--on': excluded }"
        :disabled="isLocked"
        role="switch"
        :aria-checked="excluded"
        @click="excluded = !excluded"
      >
        <span class="cdr__toggle-thumb" />
      </button>
    </div>

    <AppButton :disabled="!name.trim() || isLocked" @click="save">
      {{ isEdit ? 'Enregistrer' : 'Créer la catégorie' }}
    </AppButton>

    <AppConfirmDelete
      v-if="isEdit && !isLocked"
      ref="confirmRef"
      message="Supprimer définitivement ?"
      @confirm="remove"
    >
      Supprimer la catégorie
    </AppConfirmDelete>

  </AppDrawer>
</template>

<script setup lang="ts">
import { Check, ChevronDown, Search } from 'lucide-vue-next'
import AppInput         from '~/components/AppInput.vue'
import AppConfirmDelete from '~/components/AppConfirmDelete.vue'
import { useCategoryStore, TYPE_COLOR } from '~/stores/useCategoryStore'
import { usePeriodStore }               from '~/stores/usePeriodStore'
import { isPeriodEditable }             from '~/utils/period'
import type { ManagedCategory, TransactionType } from '~/types'
import { getIcon, ICON_KEYS, ICON_GROUPS, ICON_SEARCH_TERMS } from '~/utils/iconRegistry'
import { PALETTE_GROUPS_DARK, PALETTE_GROUPS_LIGHT, PALETTE_DARK, PALETTE_LIGHT, isValidHex } from '~/utils/colorUtils'
import { useTheme } from '~/composables/useTheme'

const props = defineProps<{
  type:      TransactionType
  category?: ManagedCategory
}>()

const open        = defineModel<boolean>({ default: false })
const store       = useCategoryStore()
const periodStore = usePeriodStore()
const { isDark }  = useTheme()
const inputRef    = ref<InstanceType<typeof AppInput>>()
const confirmRef  = ref<InstanceType<typeof AppConfirmDelete>>()

const paletteGroups = computed(() => isDark.value ? PALETTE_GROUPS_DARK : PALETTE_GROUPS_LIGHT)
const flatPalette   = computed(() => isDark.value ? PALETTE_DARK : PALETTE_LIGHT)
const isEdit        = computed(() => !!props.category)
const isLocked      = computed(() => !isPeriodEditable(periodStore.month))
const isCustomColor = computed(() => !flatPalette.value.includes(color.value))

const paletteOpen  = ref(false)
const iconsOpen    = ref(false)
const iconSearch   = ref('')
const filteredIconKeys = computed(() => {
  const q = iconSearch.value.trim().toLowerCase()
  if (!q) return ICON_KEYS
  return ICON_KEYS.filter(k => {
    const terms = (ICON_SEARCH_TERMS[k] ?? '') + ' ' + k
    return terms.toLowerCase().includes(q)
  })
})

const name       = ref('')
const iconKey    = ref('package')
const color      = ref(TYPE_COLOR[props.type])
const hexInput   = ref(TYPE_COLOR[props.type])
const isVariable = ref(false)
const excluded   = ref(false)

watch(open, (val) => {
  if (!val) { confirmRef.value?.reset(); return }
  paletteOpen.value = false
  iconsOpen.value   = false
  iconSearch.value  = ''
  if (props.category) {
    name.value       = props.category.name
    iconKey.value    = props.category.iconKey
    color.value      = props.category.color
    isVariable.value = props.category.isVariable
    excluded.value   = props.category.excluded
  } else {
    name.value       = ''
    iconKey.value    = 'package'
    color.value      = TYPE_COLOR[props.type]
    isVariable.value = false
    excluded.value   = false
  }
  hexInput.value = color.value
  nextTick(() => inputRef.value?.focus())
})

function onColorPicker(e: Event) {
  const val = (e.target as HTMLInputElement).value
  color.value    = val
  hexInput.value = val
}

function onHexInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  hexInput.value = raw
  if (isValidHex(raw)) color.value = raw
}

async function save() {
  if (!name.value.trim() || isLocked.value) return
  if (props.category) {
    await store.updateCategory(props.category.id, name.value, iconKey.value, color.value, isVariable.value, excluded.value)
  } else {
    await store.addCategory(props.type, name.value, iconKey.value, color.value)
  }
  open.value = false
}

async function remove() {
  if (!props.category) return
  await store.deleteCategory(props.category.id)
  open.value = false
}
</script>

<style scoped lang="scss">
.cdr {
  &__preview {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
  }

  &__preview-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__preview-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  // ── Section couleur collapsible ──────────────────────────────────────────

  &__color-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__color-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0 10px;
    background: transparent;
    cursor: pointer;
    &:disabled { opacity: 0.4; pointer-events: none; }
  }

  &__color-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    letter-spacing: 0.08em;
  }

  &__color-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__chevron {
    color: var(--color-text-muted);
    flex-shrink: 0;
    transition: transform $transition-fast;
    &--open { transform: rotate(180deg); }
  }

  // ── Palette ──────────────────────────────────────────────────────────────

  &__palette {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 4px;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__group-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__swatches {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 3px 2px 5px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }

    &--custom {
      align-items: center;
      overflow: visible;
    }
  }

  &__swatch {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: box-shadow $transition-fast;

    &--selected {
      // Double ring : couleur de fond → blanc — ne déborde pas en dehors du swatch
      box-shadow: 0 0 0 2.5px var(--color-bg-card), 0 0 0 4.5px white;
    }
    &:active   { opacity: 0.75; }
    &:disabled { opacity: 0.4; pointer-events: none; }

    // Swatch du picker libre
    &--picker {
      background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
      position: relative;
      cursor: pointer;
      &[aria-disabled] { opacity: 0.4; pointer-events: none; }
    }
  }

  &__hidden-color {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border-radius: 50%;
  }

  // ── Champ hex ────────────────────────────────────────────────────────────

  &__hex {
    flex: 1;
    min-width: 0;
    height: 30px;
    padding: 0 10px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 13px;
    font-family: monospace;
    color: var(--color-text-primary);
    caret-color: var(--color-accent);
    outline: none;
    transition: border-color $transition-fast;

    &:focus       { border-color: var(--color-accent); }
    &::placeholder { color: var(--color-text-muted); }
    &:disabled    { opacity: 0.4; pointer-events: none; }
  }

  // ── Icônes ───────────────────────────────────────────────────────────────

  &__icon-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 4px;
  }

  &__icon-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    height: 36px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: border-color $transition-fast;

    &:focus-within { border-color: var(--color-accent); }
  }

  &__icon-search-ico {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__icon-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 14px;
    color: var(--color-text-primary);
    caret-color: var(--color-accent);

    &::placeholder { color: var(--color-text-muted); }
    // Masque le bouton natif "effacer" sur Safari/Chrome
    &::-webkit-search-cancel-button { display: none; }
    &:disabled { opacity: 0.4; pointer-events: none; }
  }

  &__icon-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__icon-empty {
    font-size: 13px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 12px 0;
  }

  &__icons {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }

  &__icon-btn {
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    transition: background $transition-fast, color $transition-fast;

    &:hover:not(&--selected) {
      background: var(--color-bg-card);
      color: var(--color-text-primary);
    }

    &--selected { font-weight: bold; }
    &:disabled  { opacity: 0.4; pointer-events: none; }
  }

  // ── Toggle catégorie variable ────────────────────────────────────────────

  &__variable-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 4px 0;
  }

  &__variable-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__variable-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  &__variable-hint {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  &__toggle {
    width: 44px;
    height: 26px;
    border-radius: 13px;
    background: var(--color-border);
    flex-shrink: 0;
    position: relative;
    transition: background $transition-fast;
    cursor: pointer;

    &--on { background: var(--color-accent); }
    &:disabled { opacity: 0.4; pointer-events: none; }
  }

  &__toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: transform $transition-fast;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    .cdr__toggle--on & { transform: translateX(18px); }
  }
}
</style>
