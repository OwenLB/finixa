<template>
  <div class="amount-input" @click="focus">
    <span class="amount-input__label">{{ $t('form.amount') }}</span>

    <div class="amount-input__display">
      <!-- Input caché — capte le clavier mobile et desktop -->
      <input
        ref="inputRef"
        class="amount-input__capture"
        type="tel"
        inputmode="numeric"
        @focus="focused = true"
        @blur="focused = false"
        @keydown="onKeyDown"
        @input="onMobileInput"
      />

      <span class="amount-input__number" :class="{ 'amount-input__number--empty': cents === 0 }">
        {{ integerDisplay }}<span class="amount-input__decimal">,{{ decimalDisplay }}</span><span v-if="focused" class="amount-input__cursor" />
      </span>
      <span class="amount-input__currency">{{ currencySymbol }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue?: number }>()
const emit  = defineEmits<{ 'update:modelValue': [value: number] }>()

const currencyStore = useCurrencyStore()
const currencySymbol = computed(() =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyStore.currency })
    .formatToParts(0)
    .find(p => p.type === 'currency')?.value ?? currencyStore.currency
)

const inputRef = ref<HTMLInputElement>()
const cents    = ref(Math.round((props.modelValue ?? 0) * 100))
const focused  = ref(false)

// Sync externe → interne (reset à 0 ou pré-remplissage depuis le parent)
watch(() => props.modelValue, (val) => {
  cents.value = Math.round((val ?? 0) * 100)
})
const MAX_CENTS = 99_999_99      // ~999 999,99 €

// Parties d'affichage
const integerDisplay = computed(() =>
  Math.floor(cents.value / 100).toLocaleString('fr-FR')
)
const decimalDisplay = computed(() =>
  String(cents.value % 100).padStart(2, '0')
)

function focus() {
  inputRef.value?.focus()
}

function addDigit(d: number) {
  if (cents.value >= MAX_CENTS) return
  cents.value = cents.value * 10 + d
  emit('update:modelValue', cents.value / 100)
}

function removeDigit() {
  cents.value = Math.floor(cents.value / 10)
  emit('update:modelValue', cents.value / 100)
}

// Desktop : interception avant rendu dans l'input
function onKeyDown(e: KeyboardEvent) {
  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    addDigit(parseInt(e.key))
    return
  }
  if (e.key === 'Backspace') {
    e.preventDefault()
    removeDigit()
  }
}

// Mobile : on lit le dernier caractère tapé puis on vide l'input
function onMobileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const last  = input.value.slice(-1)
  input.value = ''               // reset immédiat pour rester vierge

  if (last >= '0' && last <= '9') {
    addDigit(parseInt(last))
  }
}
</script>

<style scoped lang="scss">
.amount-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px $page-padding-x 14px;
  cursor: text;

  &__label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  &__display {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  // Input invisible mais fonctionnel (capte le focus/clavier)
  &__capture {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: text;
    caret-color: transparent;
  }

  &__number {
    font-family: var(--font-title);
    font-size: 3.5rem;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
    pointer-events: none;

    &--empty { color: var(--color-text-muted); }
  }

  &__cursor {
    display: inline-block;
    width: 3px;
    height: 0.8em;
    background: var(--color-accent);
    border-radius: 2px;
    margin-left: 3px;
    vertical-align: middle;
    animation: amount-cursor-blink 1s step-end infinite;
  }

  @keyframes amount-cursor-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  &__decimal {
    font-size: 2.5rem;
    font-weight: 600;
  }

  &__currency {
    font-family: var(--font-title);
    font-size: 1.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    pointer-events: none;
  }
}
</style>
