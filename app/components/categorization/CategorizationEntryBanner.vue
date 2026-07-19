<template>
  <AlertBanner
    :count="count"
    :label="$t('categorization.banner.label', count)"
    :cta="$t('categorization.banner.cta')"
    color="#f59e0b"
    @action="$emit('start')"
  />
</template>

<script setup lang="ts">
import AlertBanner from '~/components/ui/AlertBanner.vue'

defineProps<{ count: number }>()
defineEmits<{ start: [] }>()
</script>
