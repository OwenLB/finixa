<template>
  <div class="auth-layout">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.auth-layout {
  min-height: 100dvh;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px $page-padding-x;
}
</style>
