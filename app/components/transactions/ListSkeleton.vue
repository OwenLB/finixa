<template>
  <div v-for="g in 2" :key="g" class="sk-group">
    <UiAppSkeleton height="12px" width="80px" border-radius="4px" class="sk-group__date" />
    <div v-for="i in 3" :key="i" class="sk-row">
      <UiAppSkeleton width="36px" height="36px" border-radius="10px" />
      <div class="sk-row__text">
        <UiAppSkeleton height="13px" :width="i === 2 ? '100px' : '130px'" border-radius="4px" />
        <UiAppSkeleton height="11px" width="70px" border-radius="4px" />
      </div>
      <UiAppSkeleton height="13px" width="55px" border-radius="4px" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.sk-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 12px 0;

  &__date { margin-bottom: 12px; }
}

.sk-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;

  & + & { border-top: 1px solid var(--color-border-subtle); }

  &__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
