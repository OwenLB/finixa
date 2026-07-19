<template>
  <MoreSettingsRow
    :label="$t('more.resetData')"
    icon-bg="#ef444420"
    clickable
    chevron
    @click="resetOpen = true"
  >
    <template #icon><Trash2 :size="16" style="color:#ef4444" /></template>
  </MoreSettingsRow>
  <MoreSettingsRow
    :label="$t('more.deleteAccount')"
    icon-bg="#ef444420"
    clickable
    chevron
    @click="deleteOpen = true"
  >
    <template #icon><UserX :size="16" style="color:#ef4444" /></template>
  </MoreSettingsRow>

  <!-- Confirmation : supprimer toutes les données -->
  <AppDrawer v-model="resetOpen" :title="$t('more.resetDataConfirm.title')" desktop-variant="center">
    <div class="danger-confirm">
      <p class="danger-confirm__desc">{{ $t('more.resetDataConfirm.description') }}</p>
      <p v-if="error" class="danger-confirm__error">{{ error }}</p>
      <AppButton variant="danger" :disabled="loading" @click="confirmReset">
        {{ loading ? $t('more.resetDataConfirm.loading') : $t('more.resetDataConfirm.confirm') }}
      </AppButton>
      <AppButton variant="ghost" :disabled="loading" @click="resetOpen = false">
        {{ $t('common.cancel') }}
      </AppButton>
    </div>
  </AppDrawer>

  <!-- Confirmation : supprimer le compte -->
  <AppDrawer v-model="deleteOpen" :title="$t('more.deleteAccountConfirm.title')" desktop-variant="center">
    <div class="danger-confirm">
      <p class="danger-confirm__desc">{{ $t('more.deleteAccountConfirm.description') }}</p>
      <p v-if="error" class="danger-confirm__error">{{ error }}</p>
      <AppButton variant="danger" :disabled="loading" @click="confirmDelete">
        {{ loading ? $t('more.deleteAccountConfirm.loading') : $t('more.deleteAccountConfirm.confirm') }}
      </AppButton>
      <AppButton variant="ghost" :disabled="loading" @click="deleteOpen = false">
        {{ $t('common.cancel') }}
      </AppButton>
    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
import { Trash2, UserX } from 'lucide-vue-next'
import { signOutAndReload } from '~/utils/auth'

const supabase = useSupabaseClient()

const resetOpen  = ref(false)
const deleteOpen = ref(false)
const loading    = ref(false)
const error      = ref('')

async function confirmReset() {
  error.value   = ''
  loading.value = true
  try {
    const { error: rpcError } = await supabase.rpc('reset_account_data')
    if (rpcError) throw rpcError
    resetOpen.value = false
    // Hash router : un chemin réel /dashboard ferait un 404 sur hébergement statique
    window.location.hash = '#/dashboard'
    window.location.reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  error.value   = ''
  loading.value = true
  try {
    const { error: fnError } = await supabase.functions.invoke('delete-account')
    if (fnError) throw fnError
    await signOutAndReload(supabase)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.danger-confirm {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;

  &__desc {
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-text-secondary);
  }

  &__error {
    font-size: 13px;
    color: var(--color-danger);
    text-align: center;
  }
}
</style>
