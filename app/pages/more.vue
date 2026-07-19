<template>
  <PullToRefresh :refresh="refreshAll">
  <div class="more">
    <PageHeader :title="$t('more.title')" :show-date="false" />

    <div class="more__content">

      <MoreProfileCard :name="userName" :email="userEmail" @edit="profileDrawer = true" />

      <MoreEditProfileDrawer v-model="profileDrawer" />
      <MoreCsvImportDrawer v-model="csvImportDrawer" />
      <MoreNotificationsDrawer v-model="notifDrawer" />
      <MoreSecurityDrawer v-model="securityDrawer" />

      <!-- Outils : actions et fonctionnalités de gestion -->
      <MoreSection :title="$t('more.sections.tools')">
        <MoreFavoritesSection />
        <MoreRecurringSection />
        <MoreSettingsRow :label="$t('csvImport.settingsLabel')" icon-bg="#f472b620" clickable chevron @click="csvImportDrawer = true">
          <template #icon><FileUp :size="16" style="color:#f472b6" /></template>
        </MoreSettingsRow>
      </MoreSection>

      <!-- Enveloppes (section autonome avec toggle) -->
      <!-- Préférences : apparence + période + enveloppes -->
      <MoreAppearanceSection />
      <MorePeriodSection />
      <MoreEnvelopeSection />
      <MoreSection :title="$t('more.sections.account')">
        <MoreSettingsRow v-if="isSupported" :label="$t('more.notifications')" icon-bg="#818cf820" clickable chevron @click="notifDrawer = true">
          <template #icon><Bell :size="16" style="color:#818cf8" /></template>
          <span class="more__value" :style="permission === 'denied' ? 'color:#ef4444' : ''">
            {{ permission === 'denied' ? $t('more.notifDenied') : !isSubscribed ? $t('more.notifOff') : prefs.enabled ? $t('more.notifOn') : $t('more.notifOff') }}
          </span>
        </MoreSettingsRow>
        <MoreSettingsRow :label="$t('more.security')" icon-bg="#34d39920" clickable chevron @click="securityDrawer = true">
          <template #icon><Shield :size="16" style="color:#34d399" /></template>
        </MoreSettingsRow>
        <MoreApiKeySection />
        <MoreDangerSection />
      </MoreSection>

      <!-- Statistiques du mois -->
      <MoreSection :title="$t('more.sections.stats')">
        <MoreSettingsRow :label="$t('more.totalMonth')" icon-bg="#818cf820">
          <template #icon><Hash :size="16" style="color:#818cf8" /></template>
          <span class="more__value">{{ $t('more.totalCount', { n: txCount }, txCount) }}</span>
        </MoreSettingsRow>
        <MoreSettingsRow :label="$t('more.checked')" icon-bg="#34d39920">
          <template #icon><CheckCircle :size="16" style="color:#34d399" /></template>
          <span class="more__value">{{ txChecked }} / {{ txCount }}</span>
        </MoreSettingsRow>
        <MoreSettingsRow :label="$t('more.pending')" icon-bg="#fbbf2420">
          <template #icon><Clock :size="16" style="color:#fbbf24" /></template>
          <span class="more__value">{{ txPending }}</span>
        </MoreSettingsRow>
      </MoreSection>

      <!-- À propos -->
      <MoreSection :title="$t('more.sections.about')">
        <MoreSettingsRow :label="$t('more.version')" icon-bg="#818cf820">
          <template #icon><Info :size="16" style="color:#818cf8" /></template>
          <span class="more__value">0.1.0 — MVP</span>
        </MoreSettingsRow>
      </MoreSection>

      <button class="more__logout" @click="logout">
        <LogOut :size="16" />
        {{ $t('more.logout') }}
      </button>

    </div>

  </div>
  </PullToRefresh>
</template>

<script setup lang="ts">
import PullToRefresh from '~/components/PullToRefresh.vue'
import { Hash, CheckCircle, Clock, Bell, Shield, Info, LogOut, FileUp } from 'lucide-vue-next'
import { _csvOpenDrawer } from '~/composables/csvRecurringState'
import { signOutAndReload } from '~/utils/auth'
import { useTransactionStore } from '~/stores/useTransactionStore'
import MoreProfileCard         from '~/components/more/ProfileCard.vue'
import MoreSettingsRow         from '~/components/more/SettingsRow.vue'
import MoreEditProfileDrawer   from '~/components/more/EditProfileDrawer.vue'
import MoreAppearanceSection   from '~/components/more/AppearanceSection.vue'
import MorePeriodSection       from '~/components/more/PeriodSection.vue'
import MoreSecurityDrawer      from '~/components/more/SecurityDrawer.vue'

const { refreshAll } = usePageRefresh()
const { permission, prefs, isSubscribed, isSupported } = usePushNotifications()
const notifDrawer = ref(false)
const txStore  = useTransactionStore()
const supabase = useSupabaseClient()
const router   = useRouter()
const route    = useRoute()
const user     = useSupabaseUser()

const userName  = computed(() => user.value?.user_metadata?.full_name ?? user.value?.email ?? '')
const userEmail = computed(() => user.value?.email ?? '')

const csvImportDrawer = ref(false)
const profileDrawer   = ref(false)
const securityDrawer  = ref(false)

// Ouvre le drawer CSV (phase recurring) si on arrive depuis la queue de catégorisation
watchEffect(() => {
  if (route.query.openCsv === '1') {
    csvImportDrawer.value = true
    router.replace({ query: {} })
  }
})

// Ouvre le drawer d'import (sélecteur IA/CSV) quand on arrive depuis l'onboarding
watchEffect(() => {
  if (route.query.import === '1') {
    csvImportDrawer.value = true
    router.replace({ query: {} })
  }
})

// Ouvre le drawer CSV en phase détection quand RecurringSection le demande
watch(_csvOpenDrawer, (v) => {
  if (v) {
    _csvOpenDrawer.value  = false
    csvImportDrawer.value = true
  }
})

async function logout() {
  await signOutAndReload(supabase)
}

// Les transactions du store sont déjà filtrées sur la période active
const monthlyTx = computed(() => txStore.transactions)

const txCount   = computed(() => monthlyTx.value.length)
const txChecked = computed(() => monthlyTx.value.filter(t => t.status === 'checked').length)
const txPending = computed(() => monthlyTx.value.filter(t => t.status === 'pending').length)
</script>

<style scoped lang="scss">
.more {
  &__content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 8px $page-padding-x calc(24px + #{$tab-bar-height});

    @media (min-width: $breakpoint-lg) {
      padding: 8px 24px 32px;
    }
  }

  &__value {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  &__logout {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    font-size: 14px;
    font-weight: 500;
    color: #ef4444;
    background: var(--color-bg-card);
    border-radius: var(--radius-md);
    transition: opacity $transition-fast;

    &:active { opacity: 0.7; }
  }
}
</style>
