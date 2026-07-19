<template>
  <AppDrawer v-model="open" :title="$t('more.editProfile.title')">
    <form class="epd__form" @submit.prevent="save">
      <div class="epd__field">
        <label class="epd__label">{{ $t('more.editProfile.fullname') }}</label>
        <input
          v-model="editName"
          class="epd__input"
          type="text"
          autocomplete="name"
          :placeholder="$t('more.editProfile.fullnamePlaceholder')"
        />
      </div>
      <p v-if="error" class="epd__error">{{ error }}</p>
      <AppButton type="submit" :disabled="loading">
        {{ loading ? $t('more.editProfile.saving') : $t('more.editProfile.save') }}
      </AppButton>
    </form>
  </AppDrawer>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const { t }    = useI18n()
const supabase = useSupabaseClient()
const user     = useSupabaseUser()

const editName = ref('')
const loading  = ref(false)
const error    = ref('')

watch(open, (val) => {
  if (val) {
    editName.value = user.value?.user_metadata?.full_name ?? ''
    error.value    = ''
  }
})

async function save() {
  error.value   = ''
  loading.value = true
  const { error: err } = await supabase.auth.updateUser({ data: { full_name: editName.value } })
  loading.value = false
  if (err) {
    error.value = t('more.editProfile.error')
  } else {
    open.value = false
  }
}
</script>

<style scoped lang="scss">
.epd {
  &__form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__input {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    font-size: 1rem;
    color: var(--color-text-primary);
    outline: none;
    transition: border-color $transition-fast;

    &::placeholder { color: var(--color-text-muted); }
    &:focus { border-color: var(--color-accent); }
  }

  &__error {
    font-size: 0.85rem;
    color: var(--color-danger);
    text-align: center;
  }
}
</style>
