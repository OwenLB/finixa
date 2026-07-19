<template>
  <AppDrawer v-model="open" :title="isEdit ? $t('savingsGoals.editTitle') : $t('savingsGoals.newTitle')">

    <!-- Prévisualisation -->
    <div class="sgfd__preview">
      <div class="sgfd__preview-icon" :style="{ background: color + '28' }">
        <PiggyBank :size="20" :style="{ color }" />
      </div>
      <span class="sgfd__preview-name">{{ name || $t('savingsGoals.namePlaceholder') }}</span>
    </div>

    <AppFormField :label="$t('savingsGoals.nameLabel')">
      <AppInput
        ref="inputRef"
        v-model="name"
        :placeholder="$t('savingsGoals.namePlaceholder')"
        @keydown.enter="save"
      />
    </AppFormField>

    <AppFormField :label="$t('savingsGoals.targetLabel')">
      <AppInput
        v-model.number="targetAmount"
        type="number"
        :placeholder="$t('savingsGoals.targetPlaceholder')"
        inputmode="decimal"
      />
    </AppFormField>

    <AppFormField v-if="!isEdit" :label="$t('savingsGoals.startLabel')">
      <AppInput
        v-model.number="startAmount"
        type="number"
        :placeholder="$t('savingsGoals.startPlaceholder')"
        inputmode="decimal"
      />
    </AppFormField>

    <AppFormField :label="$t('savingsGoals.colorLabel')">
      <div class="sgfd__colors">
        <button
          v-for="c in palette"
          :key="c"
          class="sgfd__color"
          :class="{ 'sgfd__color--selected': color === c }"
          :style="{ background: c }"
          :aria-label="$t('a11y.selectColor')"
          @click="color = c"
        >
          <Check v-if="color === c" :size="12" color="white" />
        </button>
      </div>
    </AppFormField>

    <AppButton :disabled="!canSave || saving" @click="save">
      {{ isEdit ? $t('savingsGoals.save') : $t('savingsGoals.create') }}
    </AppButton>

    <AppConfirmDelete
      v-if="isEdit"
      ref="confirmRef"
      :message="$t('savingsGoals.deleteConfirm')"
      @confirm="remove"
    >
      {{ $t('savingsGoals.deleteBtn') }}
    </AppConfirmDelete>

  </AppDrawer>
</template>

<script setup lang="ts">
import { PiggyBank, Check } from 'lucide-vue-next'
import AppInput         from '~/components/AppInput.vue'
import AppConfirmDelete from '~/components/AppConfirmDelete.vue'
import { useSavingsGoalStore } from '~/stores/useSavingsGoalStore'
import { PALETTE_DARK, PALETTE_LIGHT } from '~/utils/colorUtils'
import { useTheme } from '~/composables/useTheme'
import type { SavingsGoal } from '~/types'

const props = defineProps<{ goal?: SavingsGoal }>()

const open       = defineModel<boolean>({ default: false })
const store      = useSavingsGoalStore()
const { isDark } = useTheme()
const inputRef   = ref<InstanceType<typeof AppInput>>()
const confirmRef = ref<InstanceType<typeof AppConfirmDelete>>()

const palette = computed(() => isDark.value ? PALETTE_DARK : PALETTE_LIGHT)
const isEdit  = computed(() => !!props.goal)

const name         = ref('')
const targetAmount = ref<number | ''>('')
const startAmount  = ref<number | ''>(0)
const color        = ref('#60a5fa')
const saving       = ref(false)

const canSave = computed(() =>
  name.value.trim().length > 0 && Number(targetAmount.value) > 0
)

watch(open, (val) => {
  if (!val) { confirmRef.value?.reset(); return }
  if (props.goal) {
    name.value         = props.goal.name
    targetAmount.value = props.goal.targetAmount
    color.value        = props.goal.color
  } else {
    name.value         = ''
    targetAmount.value = ''
    startAmount.value  = 0
    color.value        = '#60a5fa'
  }
  nextTick(() => inputRef.value?.focus())
})

async function save() {
  if (!canSave.value) return
  saving.value = true
  if (props.goal) {
    await store.update(props.goal.id, name.value, Number(targetAmount.value), color.value)
  } else {
    await store.create(name.value, Number(targetAmount.value), Number(startAmount.value) || 0, color.value)
  }
  saving.value = false
  open.value   = false
}

async function remove() {
  if (!props.goal) return
  await store.remove(props.goal.id)
  open.value = false
}
</script>

<style scoped lang="scss">
.sgfd {
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

  &__colors {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__color {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform $transition-fast;

    &--selected { transform: scale(1.15); outline: 2px solid white; outline-offset: 2px; }
    &:active    { transform: scale(0.9); }
  }
}
</style>
