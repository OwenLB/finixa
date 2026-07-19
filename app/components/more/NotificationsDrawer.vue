<template>
  <AppDrawer v-model="open" :title="$t('notif.title')">
    <div class="nd">

      <!-- ── Étape activation ──────────────────────────────────── -->
      <template v-if="!isSubscribed">
        <div class="nd__activate">
          <div class="nd__activate-icon">🔔</div>
          <p class="nd__activate-title">{{ $t('notif.activateTitle') }}</p>
          <p class="nd__activate-desc">{{ $t('notif.activateDesc') }}</p>
          <p v-if="showInstallBanner" class="nd__activate-warning">{{ $t('notif.iosWarning') }}</p>
          <button class="nd__test-tonight" :disabled="loading || showInstallBanner" @click="subscribe">
            <span v-if="loading">...</span>
            <span v-else>{{ $t('notif.activateBtn') }}</span>
          </button>
        </div>
      </template>

      <!-- ── Config (après activation) ─────────────────────────── -->
      <template v-else>

      <!-- ── Global ─────────────────────────────────────────── -->
      <div class="nd__card">
        <label class="nd__row nd__row--toggle">
          <span class="nd__row-label">{{ $t('notif.enabled') }}</span>
          <button
            role="switch"
            :aria-checked="prefs.enabled"
            class="nd__toggle"
            :class="{ 'nd__toggle--on': prefs.enabled }"
            @click="prefs.enabled = !prefs.enabled"
          />
        </label>
        <div class="nd__row">
          <span class="nd__row-label nd__row-label--muted">{{ $t('notif.hour') }}</span>
          <input
            type="time"
            :value="hourToTime(prefs.hour)"
            :disabled="!prefs.enabled"
            class="nd__time-input"
            @change="prefs.hour = timeToHour(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- ── Blocs config ───────────────────────────────────── -->
      <div class="nd__blocks" :class="{ 'nd__blocks--off': !prefs.enabled }">

        <!-- Rappel inactivité -->
        <p class="nd__section-label">{{ $t('notif.inactivity.title') }}</p>
        <div class="nd__card">
          <div class="nd__row nd__row--toggle">
            <div>
              <span class="nd__row-label">{{ $t('notif.inactivity.desc') }}</span>
            </div>
            <button
              role="switch"
              :aria-checked="prefs.inactivity.enabled"
              class="nd__toggle"
              :class="{ 'nd__toggle--on': prefs.inactivity.enabled }"
              @click="prefs.inactivity.enabled = !prefs.inactivity.enabled"
            />
          </div>
          <Transition name="nd-expand">
            <div v-if="prefs.inactivity.enabled" class="nd__threshold">
              <span class="nd__threshold-label">{{ $t('notif.inactivity.after') }}</span>
              <div class="nd__pills">
                <button
                  v-for="d in [1, 2, 3, 5, 7]"
                  :key="d"
                  class="nd__pill"
                  :class="{ 'nd__pill--on': prefs.inactivity.days === d }"
                  @click="prefs.inactivity.days = d"
                >{{ d }}j</button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Rappel -->
        <p class="nd__section-label">{{ $t('notif.digestGroup') }}</p>
        <div class="nd__card">
          <!-- Non catégorisées -->
          <div class="nd__row nd__row--toggle">
            <div>
              <span class="nd__row-label">{{ $t('notif.uncategorized.title') }}</span>
              <span class="nd__row-sub">{{ $t('notif.uncategorized.desc') }}</span>
            </div>
            <button
              role="switch"
              :aria-checked="prefs.uncategorized.enabled"
              class="nd__toggle"
              :class="{ 'nd__toggle--on': prefs.uncategorized.enabled }"
              @click="prefs.uncategorized.enabled = !prefs.uncategorized.enabled"
            />
          </div>
          <Transition name="nd-expand">
            <div v-if="prefs.uncategorized.enabled" class="nd__threshold">
              <span class="nd__threshold-label">{{ $t('notif.uncategorized.from') }}</span>
              <div class="nd__pills">
                <button
                  v-for="n in [1, 3, 5]"
                  :key="n"
                  class="nd__pill"
                  :class="{ 'nd__pill--on': prefs.uncategorized.threshold === n }"
                  @click="prefs.uncategorized.threshold = n"
                >{{ n }}</button>
              </div>
            </div>
          </Transition>

          <div class="nd__divider" />

          <!-- Non pointées -->
          <div class="nd__row nd__row--toggle">
            <div>
              <span class="nd__row-label">{{ $t('notif.pending.title') }}</span>
              <span class="nd__row-sub">{{ $t('notif.pending.desc') }}</span>
            </div>
            <button
              role="switch"
              :aria-checked="prefs.pending.enabled"
              class="nd__toggle"
              :class="{ 'nd__toggle--on': prefs.pending.enabled }"
              @click="prefs.pending.enabled = !prefs.pending.enabled"
            />
          </div>
          <Transition name="nd-expand">
            <div v-if="prefs.pending.enabled" class="nd__threshold">
              <span class="nd__threshold-label">{{ $t('notif.pending.from') }}</span>
              <div class="nd__pills">
                <button
                  v-for="n in [1, 3, 5, 10]"
                  :key="n"
                  class="nd__pill"
                  :class="{ 'nd__pill--on': prefs.pending.threshold === n }"
                  @click="prefs.pending.threshold = n"
                >{{ n }}</button>
              </div>
            </div>
          </Transition>
        </div>

      </div>

      <!-- ── Aperçu ce soir ─────────────────────────────────── -->
      <div class="nd__preview" :class="tonightNotification ? `nd__preview--${tonightNotification.type}` : 'nd__preview--empty'">
        <p class="nd__preview-label">{{ $t('notif.preview') }}</p>
        <template v-if="tonightNotification">
          <p class="nd__preview-app">Finixa</p>
          <p class="nd__preview-title">{{ tonightNotification.label }}</p>
          <p class="nd__preview-detail">{{ tonightNotification.detail }}</p>
        </template>
        <p v-else class="nd__preview-body">{{ $t('notif.previewEmpty') }}</p>
      </div>

      <!-- ── Désactiver ────────────────────────────────────────── -->
      <button class="nd__unsubscribe" :disabled="loading" @click="unsubscribe">
        {{ $t('notif.deactivate') }}
      </button>

      </template> <!-- fin v-if isSubscribed -->

    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const {
  prefs,
  isSubscribed,
  loading,
  showInstallBanner,
  tonightNotification,
  init,
  subscribe,
  unsubscribe,
} = usePushNotifications()

onMounted(() => init())

function hourToTime(h: number) { return `${String(h).padStart(2, '0')}:00` }
function timeToHour(t: string) { return parseInt(t.split(':')[0], 10) }
</script>

<style scoped lang="scss">
.nd {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 12px;

  // ── Labels de section ───────────────────────────────────────
  &__section-label {
    @include label-caps;
    padding: 0 2px;
  }

  // ── Card générique ──────────────────────────────────────────
  &__card {
    background: var(--color-bg-card);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  // ── Rows ────────────────────────────────────────────────────
  &__row {
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    &--toggle { align-items: center; }
  }

  &__row-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    &--muted { color: var(--color-text-muted); font-weight: 400; }
  }

  &__row-sub {
    display: block;
    font-size: 12px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }

  // ── Divider ─────────────────────────────────────────────────
  &__divider { height: 1px; background: var(--color-border); }

  // ── Toggle switch ───────────────────────────────────────────
  &__toggle {
    position: relative;
    width: 46px;
    height: 28px;
    border-radius: 14px;
    background: var(--color-border);
    transition: background 220ms ease;
    flex-shrink: 0;

    &::after {
      content: '';
      position: absolute;
      top: 4px; left: 4px;
      width: 20px; height: 20px;
      border-radius: 50%;
      background: var(--color-text-secondary);
      transition: transform 220ms ease, background 220ms ease;
      box-shadow: var(--shadow-sm);
    }

    &--on {
      background: var(--color-accent);
      &::after {
        transform: translateX(18px);
        background: var(--color-accent-fg);
      }
    }
    &:disabled { opacity: 0.35; cursor: default; }
  }

  // ── Time input natif ─────────────────────────────────────────
  &__time-input {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 6px 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    color-scheme: inherit;
    cursor: pointer;
    min-width: 90px;
    text-align: center;

    &:disabled { opacity: 0.4; cursor: default; }
  }

  // ── Blocs désactivés ────────────────────────────────────────
  &__blocks {
    display: contents;
    &--off { opacity: 0.45; pointer-events: none; }
  }

  // ── Threshold row ───────────────────────────────────────────
  &__threshold-group {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__threshold {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px 14px;
    border-top: 1px solid var(--color-border);
    overflow: hidden;
  }

  &__threshold-label {
    font-size: 12px;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__pills { display: flex; gap: 6px; }

  &__pill {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border: 1px solid transparent;
    transition: background 150ms, color 150ms, border-color 150ms;

    &--on {
      background: var(--color-accent);
      color: var(--color-accent-fg);
      border-color: var(--color-accent);
    }
  }

  // ── Activation (non souscrit) ────────────────────────────────
  &__activate {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 32px 16px 8px;
    gap: 8px;
  }

  &__activate-icon {
    font-size: 48px;
    line-height: 1;
    margin-bottom: 4px;
  }

  &__activate-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__activate-desc {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    max-width: 280px;
  }

  &__activate-warning {
    font-size: 13px;
    color: $p-yellow;
    background: rgba($p-yellow, 0.1);
    border: 1px solid rgba($p-yellow, 0.25);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    line-height: 1.5;
    max-width: 280px;
    margin-top: 4px;
  }

  // ── Désactiver ───────────────────────────────────────────────
  &__unsubscribe {
    width: 100%;
    padding: 13px;
    border-radius: var(--radius-lg);
    font-size: 14px;
    font-weight: 500;
    color: $p-red;
    background: rgba($p-red, 0.08);
    border: 1px solid rgba($p-red, 0.18);
    transition: background 150ms, border-color 150ms;

    &:active { background: rgba($p-red, 0.14); }
    &:disabled { opacity: 0.4; cursor: default; }
  }

  &__test-tonight {
    @include btn-action;
    border-radius: var(--radius-lg);
    font-size: 14px;
  }

  // ── Aperçu ce soir ──────────────────────────────────────────
  &__preview {
    border-radius: var(--radius-lg);
    padding: 14px 16px;
    border: 1px solid var(--color-border);

    &--inactivity {
      background: rgba($p-yellow, 0.08);
      border-color: rgba($p-yellow, 0.2);
      .nd__preview-body { color: $p-yellow; }
    }

    &--digest {
      background: rgba($p-indigo-400, 0.08);
      border-color: rgba($p-indigo-400, 0.2);
      .nd__preview-body { color: $p-indigo-300; }
    }

    &--empty {
      background: rgba($p-green, 0.06);
      border-color: rgba($p-green, 0.15);
      .nd__preview-body { color: $p-green; }
    }
  }

  &__preview-label {
    @include label-caps;
    margin-bottom: 8px;
  }

  &__preview-app {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;
  }

  &__preview-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__preview-detail {
    font-size: 13px;
    font-weight: 400;
    color: var(--color-text-secondary);
    margin-top: 1px;
  }

  &__preview-body {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-primary);
  }
}

// ── Transition expand ──────────────────────────────────────────
.nd-expand-enter-active,
.nd-expand-leave-active {
  transition: max-height 220ms ease, opacity 220ms ease;
  max-height: 80px;
  overflow: hidden;
}
.nd-expand-enter-from,
.nd-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
