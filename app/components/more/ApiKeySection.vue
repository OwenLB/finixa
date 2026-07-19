<template>
  <MoreSettingsRow
      :label="$t('apiKey.sectionLabel')"
      icon-bg="#f9731620"
      clickable
      chevron
      @click="open"
    >
      <template #icon><Smartphone :size="16" style="color:#f97316" /></template>
      <span class="api-key__status" :class="hasKey ? 'api-key__status--active' : 'api-key__status--none'">
        {{ hasKey ? $t('apiKey.statusActive') : $t('apiKey.statusNone') }}
      </span>
    </MoreSettingsRow>

    <AppDrawer v-model="drawer" :title="$t('apiKey.drawerTitle')">
      <div class="api-key__drawer">

        <!-- Clé générée — affichage unique -->
        <div v-if="generatedKey" class="api-key__reveal">
          <p class="api-key__warn">{{ $t('apiKey.copyHint') }}</p>
          <div class="api-key__box">
            <code class="api-key__value">{{ generatedKey }}</code>
            <button class="api-key__copy-btn" @click="copyKey">
              <Check v-if="copied" :size="15" />
              <Copy v-else :size="15" />
              {{ copied ? $t('apiKey.copied') : $t('apiKey.copy') }}
            </button>
          </div>
          <AppButton @click="closeAfterCopy">OK</AppButton>
        </div>

        <!-- État normal -->
        <div v-else class="api-key__actions">
          <p class="api-key__desc">{{ $t('apiKey.desc1') }}</p>
          <a
            href="https://www.icloud.com/shortcuts/d219111fb45f442784206eb76cc1c5eb"
            target="_blank"
            class="api-key__shortcut-link"
          >{{ $t('apiKey.shortcutLink') }}</a>
          <p class="api-key__desc">{{ $t('apiKey.desc2') }}</p>

          <p v-if="error" class="api-key__error">{{ error }}</p>

          <AppButton :disabled="generating" @click="generateKey">
            {{ generating ? $t('apiKey.generating') : (hasKey ? $t('apiKey.regenerate') : $t('apiKey.generate')) }}
          </AppButton>

          <button v-if="hasKey" class="api-key__revoke" :disabled="revoking" @click="revokeKey">
            {{ revoking ? '…' : $t('apiKey.revoke') }}
          </button>
        </div>

      </div>
    </AppDrawer>
</template>

<script setup lang="ts">
import { Smartphone, Copy, Check } from 'lucide-vue-next'

const supabase     = useSupabaseClient()
const hasKey       = ref(false)
const drawer       = ref(false)
const generatedKey = ref<string | null>(null)
const copied       = ref(false)
const generating   = ref(false)
const revoking     = ref(false)
const error        = ref('')

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non authentifié')
  return session.access_token
}

// Edge function Supabase (fonctionne en web ET en natif Capacitor,
// contrairement aux routes serveur Nitro absentes du build statique)
async function invokeApiKey<T>(method: 'GET' | 'POST' | 'DELETE'): Promise<T> {
  const token = await getToken()
  const { data, error: fnError } = await supabase.functions.invoke<T>('api-key', {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (fnError || data === null) throw fnError ?? new Error('Réponse vide')
  return data
}

async function fetchStatus() {
  try {
    const { hasKey: k } = await invokeApiKey<{ hasKey: boolean }>('GET')
    hasKey.value = k
  } catch {
    // Statut indisponible (réseau/route absente en build statique) : on laisse hasKey à false
  }
}

fetchStatus()

function open() {
  generatedKey.value = null
  copied.value       = false
  error.value        = ''
  drawer.value       = true
}

async function generateKey() {
  error.value      = ''
  generating.value = true
  try {
    const { key } = await invokeApiKey<{ key: string }>('POST')
    generatedKey.value = key
    hasKey.value       = true
  } catch {
    error.value = 'Erreur lors de la génération'
  } finally {
    generating.value = false
  }
}

async function revokeKey() {
  error.value    = ''
  revoking.value = true
  try {
    await invokeApiKey<{ success: boolean }>('DELETE')
    hasKey.value = false
    drawer.value = false
  } catch {
    error.value = 'Erreur lors de la révocation'
  } finally {
    revoking.value = false
  }
}

async function copyKey() {
  if (!generatedKey.value) return
  await navigator.clipboard.writeText(generatedKey.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function closeAfterCopy() {
  generatedKey.value = null
  drawer.value       = false
}
</script>

<style scoped lang="scss">
.api-key {
  &__status {
    font-size: 13px;
    &--active { color: var(--color-success); }
    &--none   { color: var(--color-text-muted); }
  }

  &__drawer {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__desc {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__error {
    font-size: 13px;
    color: var(--color-danger);
    text-align: center;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__shortcut-link {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-accent);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 4px;
    &:hover { text-decoration: underline; }
  }

  &__revoke {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-danger);
    text-align: center;
    padding: 8px;
    &:disabled { opacity: 0.5; }
  }

  &__reveal {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__warn {
    font-size: 13px;
    color: #fbbf24;
    background: #fbbf2415;
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    line-height: 1.5;
  }

  &__box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 12px;
  }

  &__value {
    font-family: monospace;
    font-size: 12px;
    color: var(--color-text-primary);
    word-break: break-all;
    line-height: 1.6;
  }

  &__copy-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-accent);
    align-self: flex-end;
  }
}
</style>
