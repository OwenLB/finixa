<template>
  <!-- summary-card -->
  <section class="summary-card">
    <!-- PeriodSelector -->
    <div class="sk-period">
      <UiAppSkeleton width="24px" height="24px" border-radius="6px" />
      <UiAppSkeleton width="110px" height="16px" border-radius="6px" />
      <UiAppSkeleton width="24px" height="24px" border-radius="6px" />
    </div>

    <!-- Heading -->
    <UiAppSkeleton width="160px" height="13px" border-radius="6px" />

    <!-- BudgetRing -->
    <div class="sk-ring-wrap">
      <UiAppSkeleton width="160px" height="160px" border-radius="50%" />
    </div>

    <!-- CategoryBars -->
    <div class="sk-bars">
      <div v-for="i in 3" :key="i" class="sk-bar-row">
        <UiAppSkeleton height="12px" width="60px" border-radius="4px" />
        <UiAppSkeleton height="8px" border-radius="4px" style="flex:1" />
      </div>
    </div>

    <!-- ViewToggle -->
    <UiAppSkeleton width="100%" height="36px" border-radius="99px" />
  </section>

  <!-- RecurringWidget -->
  <div class="sk-recurring">
    <div class="sk-recurring__header">
      <div class="sk-recurring__titles">
        <UiAppSkeleton width="120px" height="13px" border-radius="4px" />
        <UiAppSkeleton width="80px" height="11px" border-radius="4px" />
      </div>
      <UiAppSkeleton width="16px" height="16px" border-radius="4px" />
    </div>
    <div class="sk-recurring__list">
      <div v-for="i in 3" :key="i" class="sk-recurring__item">
        <UiAppSkeleton width="22px" height="22px" border-radius="6px" />
        <UiAppSkeleton height="12px" border-radius="4px" style="flex:1" />
        <UiAppSkeleton width="50px" height="12px" border-radius="4px" />
      </div>
    </div>
  </div>

  <!-- CategoryCards -->
  <section class="cat-section">
    <div class="sk-cards-section">
      <UiAppSkeleton height="11px" width="70px" border-radius="4px" />
      <div class="sk-cards-grid">
        <div v-for="i in 4" :key="i" class="sk-card">
          <div class="sk-card-header">
            <UiAppSkeleton width="24px" height="24px" border-radius="6px" />
            <UiAppSkeleton height="12px" width="60px" border-radius="4px" />
          </div>
          <UiAppSkeleton height="6px" border-radius="4px" />
          <div class="sk-card-divider" />
          <UiAppSkeleton height="13px" width="50px" border-radius="4px" style="margin-bottom:10px" />
        </div>
      </div>
    </div>
  </section>

  <!-- InsightSpendingCurve -->
  <div class="sk-chart">
    <div class="sk-chart__header">
      <UiAppSkeleton width="130px" height="13px" border-radius="4px" />
      <div class="sk-chart__legend">
        <UiAppSkeleton width="60px" height="11px" border-radius="4px" />
        <UiAppSkeleton width="60px" height="11px" border-radius="4px" />
      </div>
    </div>
    <UiAppSkeleton width="100%" height="120px" border-radius="6px" />
  </div>

  <!-- InsightSpendingHistogram -->
  <div class="sk-chart">
    <div class="sk-chart__header">
      <UiAppSkeleton width="160px" height="13px" border-radius="4px" />
    </div>
    <UiAppSkeleton width="100%" height="120px" border-radius="6px" />
  </div>
</template>

<style scoped lang="scss">
/* summary-card */
.summary-card {
  background: var(--color-bg-surface);
  padding: 20px $page-padding-x;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sk-period {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sk-ring-wrap {
  display: flex;
  justify-content: center;
}

.sk-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sk-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* RecurringWidget */
.sk-recurring {
  background: var(--color-bg-surface);
  border-radius: 12px;
  margin: 0 $page-padding-x;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px $page-padding-x;
  }

  &__titles {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 $page-padding-x 16px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

/* CategoryCards */
.cat-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk-cards-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 $page-padding-x;
}

.sk-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.sk-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: 12px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sk-card-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 -12px;
}

/* Charts */
.sk-chart {
  background: var(--color-bg-surface);
  border-radius: 12px;
  margin: 0 $page-padding-x;
  padding: 16px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__legend {
    display: flex;
    gap: 12px;
  }
}
</style>
