<template>
  <div class="bpb" :class="{ 'bpb--reverse': reverse, 'bpb--instant': instant }" :style="{ background: color + '20' }">
    <div class="bpb__fill" :style="{ width: fillWidth + '%', background: color }" />
    <div v-if="excess > 0" class="bpb__excess" :style="{ width: excessWidth + '%', background: props.excessColor ?? '#ef4444' }" />
    <!-- Segment « exclu des calculs » (ex. désépargne) — toujours rouge, appendu en fin de barre -->
    <div v-if="extraWidth > 0" class="bpb__extra" :style="{ width: extraWidth + '%' }" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  value:        number
  max:          number
  color:        string
  excessColor?: string
  reverse?:     boolean
  extra?:       number   // montant additionnel affiché en rouge (désépargne) — ignoré en mode reverse
  instant?:     boolean  // désactive la transition (panneaux pré-chargés du carousel)
}>()

// En mode normal  : excess = dépassement positif (spent > budget)
// En mode reverse : excess = dépassement négatif (remaining < 0, i.e. spent > budget)
const excess      = computed(() =>
  props.reverse
    ? Math.max(0, -props.value)
    : Math.max(0, props.value - props.max)
)
// Le segment désépargne n'a de sens qu'en vue "dépense" (non reverse)
const extra       = computed(() => (props.reverse ? 0 : Math.max(0, props.extra ?? 0)))
const total       = computed(() => (props.max || 1) + excess.value + extra.value)
const fillWidth   = computed(() => (Math.max(0, Math.min(props.value, props.max)) / total.value) * 100)
const excessWidth = computed(() => (excess.value / total.value) * 100)
const extraWidth  = computed(() => (extra.value / total.value) * 100)
</script>

<style scoped lang="scss">
.bpb {
  height: 4px;
  border-radius: 99px;
  overflow: hidden;
  display: flex;

  &--reverse { flex-direction: row-reverse; }

  &__fill,
  &__excess,
  &__extra {
    height: 100%;
    flex-shrink: 0;
    transition: width 400ms ease;
  }

  &--instant &__fill,
  &--instant &__excess,
  &--instant &__extra {
    transition: none;
  }

  &__excess { background: #ef4444; }
  &__extra  { background: #ef4444; }
}
</style>
