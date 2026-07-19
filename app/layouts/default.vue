<template>
  <div class="layout" :class="{ 'layout--desktop': isDesktop }">
    <AppSidebar v-if="isDesktop" />
    <main class="layout__content" :style="contentStyle">
      <slot />
    </main>
    <TabBar v-if="!isDesktop" />
    <AddEditPanel v-if="isDesktop" />
    <AppToast />
    <AppContextMenu />

    <!-- Écran de verrouillage PIN -->
    <AppPinLock v-if="pinStore.isLocked" />

    <!-- Drawer configuration PIN (premier lancement + settings) -->
    <AppPinSetupDrawer
      v-model="pinSetupOpen"
      :show-intro="pinSetupIsPrompt"
    />
  </div>
</template>

<script setup lang="ts">
import AddEditPanel    from '~/components/transactions/AddEditPanel.vue'
import AppContextMenu from '~/components/AppContextMenu.vue'

const { isDesktop }  = useBreakpoint()
const { isOpen: rightPanelOpen } = useRightPanel()
const user     = useSupabaseUser()
const pinStore = usePinStore()

useAppLock()

const PANEL_WIDTH    = 480
const pinSetupOpen   = ref(false)
const pinSetupIsPrompt = ref(false)

const contentStyle = computed(() =>
  isDesktop.value && rightPanelOpen.value
    ? { paddingRight: `${PANEL_WIDTH}px` }
    : {},
)

// Propose le PIN aux utilisateurs existants (et nouveaux) une seule fois
onMounted(() => {
  setTimeout(() => {
    if (user.value && !pinStore.setupShown) {
      pinSetupIsPrompt.value = true
      pinSetupOpen.value     = true
    }
  }, 1500)
})

// Exposé pour que SecurityDrawer puisse ouvrir le setup directement
provide('openPinSetup', () => {
  pinSetupIsPrompt.value = false
  pinSetupOpen.value     = true
})
</script>

<style scoped lang="scss">
.layout {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--color-bg);

  &__content {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior-y: none;
    // Mobile : espace sous le contenu = tab bar + safe area iOS
    padding-bottom: calc(#{$tab-bar-height} + env(safe-area-inset-bottom));
  }

  // ── Desktop ───────────────────────────────────────────────────
  &--desktop {
    flex-direction: row;
  }

  &--desktop &__content {
    padding-bottom: 0;
    transition: padding-right 320ms cubic-bezier(0.32, 0.72, 0, 1);
  }
}
</style>
