---
title: 'Finixa'
type: "Personal Project"
description: "Mobile-first personal finance web app — expense tracking, envelope budgeting, and recurring transactions."
stack: [
  "Nuxt 4",
  "Vue 3",
  "TypeScript",
  "Pinia",
  "Supabase",
  "PostgreSQL",
  "SCSS",
  "Capacitor",
  "Deno (Edge Functions)"
]
---

## Context

Finixa is a personal finance SaaS MVP built around one hard UX constraint: **add an expense as fast as possible from a mobile device**. It covers expense and income tracking, per-category and per-subcategory budgeting, envelope budgeting (50/30/20), virtual recurring transactions, and monthly statistics backed by PostgreSQL RPCs. The app is packaged for iOS/Android via Capacitor in addition to the web deployment.

## Stack & Architecture

- **Nuxt 4 + Vue 3 (SPA, hash routing)** — SSR is intentionally disabled: hash-based routing is required for Capacitor compatibility, as the `capacitor://` scheme does not support push-state routing.
- **Strict TypeScript** — Amounts are signed at the database level (`-50` = expense, `+1000` = income). The central discriminant is `TransactionType ('depense' | 'revenu' | 'epargne')`, used consistently from the database schema up to UI components.
- **Pinia (15 stores)** — Three-layer architecture: `app/services/` isolates all Supabase calls, stores hold state and expose mutations, pages and components consume stores. No direct Supabase calls in components.
- **Supabase (PostgreSQL + Auth + RLS)** — Row Level Security on every table. Computed views (stats, virtual recurrences) are PostgreSQL RPCs called directly from the service layer.
- **Edge Functions (Deno)** — Four serverless functions for external integrations: quick transaction insertion via API key, daily digest, push notifications, category listing endpoint.
- **Custom SCSS (token-based design system)** — No Tailwind. Design tokens are auto-injected into every component via `additionalData` in `nuxt.config`. Components use only semantic CSS custom properties.
- **Capacitor 8** — iOS/Android packaging, `@capacitor/preferences` for secure local storage (PIN, theme, onboarding state).
- **@nuxtjs/i18n** — Full FR/EN localization, `no_prefix` strategy compatible with hash routing.

## Detailed Architecture

```mermaid
flowchart TD
    subgraph MOBILE ["Mobile — Capacitor 8"]
        IOS["iOS App\n(nuxt generate → cap sync → Xcode)"]
        PREF["@capacitor/preferences\nPIN · theme · onboarding state"]
    end

    subgraph CLIENT ["Client — Nuxt 4 · Vue 3 · TypeScript · SPA · hash routing"]
        PAGES["Pages 13\ndashboard · transactions · add · budget\nmore · login · register · onboarding · confirm · ..."]
        COMPONENTS["Components 107\nadd/ · categories/ · dashboard/ · transactions/\nui/ · favorites/ · recurring/ · savings/ · categorization/"]
        COMPOSABLES["Composables 17\nuseRecurringActions · useCategorizationQueue\nuseInsightData · useAppLock · useTheme\nuseCsvImport · usePullToRefresh · useKeyboardShortcuts · ..."]
        STORES_D["Pinia — Data stores\nuseTransactionStore · useCategoryStore\nuseRecurringStore · useFavoriteStore\nuseEnvelopeStore · useSavingsGoalStore\nuseCategoryStatsStore · useDashboardStore"]
        STORES_UI["Pinia — UI stores\nusePreferencesStore · usePeriodStore\nuseFilterStore · useSelectionStore\nuseBiometricStore · useCurrencyStore"]
        SERVICES["Services 10\ntransactionService · categoryService · recurringService\ncategoryStatsService · dashboardService\npreferenceService · envelopeService · favoriteService · ..."]
        UTILS["Utils 14\nvirtualTransactions · groupByDate · period\nformatCurrency · csvParser · categoryIcon · ..."]
        I18N["i18n — FR + EN\n~20 KB each"]
        SCSS_TK["SCSS tokens\nauto-injected via additionalData"]
    end

    subgraph NUXT_API ["Nuxt Server API"]
        APIKEY_RT["/api/api-key\nstatus · generate · revoke"]
    end

    subgraph SUPABASE ["Supabase"]
        SB_AUTH["Auth\nJWT · 30-day cookie · key: finixa-auth\nredirect → /login · /confirm"]
        SB_DB[("PostgreSQL + RLS\ntransactions · categories · subcategories\nrecurring_transactions · user_preferences\nbudget_envelopes · savings_goals · favorites\npush_subscriptions · user_api_keys")]
        SB_RPC["PostgreSQL RPCs\nget_dashboard_month · get_subcategory_stats\nget_category_spent · get_variable_daily_remaining\nrecurring_virtual_for_month · get_envelope_stats · ..."]
        SB_EF["Edge Functions — Deno\nadd-transaction · user-categories\ndaily-digest · test-notification"]
    end

    subgraph EXTERN ["External integrations"]
        EXT_SC["iOS Shortcuts / Webhooks\nAPI Key SHA-256"]
        EXT_PUSH["Web Push API"]
        EXT_CSV["CSV Import — PapaParse\nclient-side only"]
    end

    PAGES --> COMPONENTS
    PAGES --> COMPOSABLES
    COMPONENTS --> STORES_D
    COMPONENTS --> STORES_UI
    COMPOSABLES --> STORES_D
    COMPOSABLES --> STORES_UI
    STORES_D --> SERVICES
    STORES_UI --> SERVICES
    STORES_D --> UTILS
    SERVICES --> SB_AUTH
    SERVICES --> SB_DB
    SERVICES --> SB_RPC
    SB_DB <--> SB_RPC
    EXT_SC --> SB_EF
    EXT_PUSH --> SB_EF
    SB_EF --> SB_DB
    EXT_CSV --> STORES_D
    CLIENT --> MOBILE
    MOBILE --> PREF
    APIKEY_RT --> SB_DB
```

## Notable Technical Points

### 1 · Transaction add flow

The full sequence from button tap to reactive UI update — the layer separation in action.

```mermaid
sequenceDiagram
    actor U as User
    participant AP as useAddPanel
    participant Form as add.vue
    participant Store as useTransactionStore
    participant Svc as transactionService
    participant SB as Supabase RLS

    U->>AP: tap "+" button
    AP->>Form: isOpen = true
    Form-->>U: drawer slides up
    U->>Form: enters amount, category, date
    Form->>Store: add(transactionForm)
    Store->>Svc: insertTransaction(form, userId)
    Svc->>SB: INSERT INTO transactions WHERE user_id = auth.uid()
    SB-->>Svc: Transaction created
    Svc-->>Store: Transaction
    Store->>Store: transactions.unshift(new)
    Store-->>Form: loading = false
    Form-->>U: drawer closed + success toast
```

### 2 · Operation date vs accounting date

Each transaction has a `date` (when the operation occurs) and a nullable `accounting_date` (when it is attributed to the budget). For recurring transactions with `accounting_offset: 'next_month'`, the accounting date is set to the 1st of the following month at materialization time.

```mermaid
flowchart LR
    subgraph STD ["Standard mode — accounting_offset: same_month"]
        A1["Debit on Jan 15th"] --> B1["date = 2026-01-15\naccounting_date = null"]
        B1 --> C1["Attributed to: January"]
    end

    subgraph DEC ["Offset mode — accounting_offset: next_month"]
        A2["Recurring debit\non Jan 28th"] --> B2["date = 2026-01-28"]
        B2 --> C2["At materialization:\naccounting_date = 2026-02-01"]
        C2 --> D2["Attributed to: February"]
    end
```

Concrete use case: a subscription debited on December 28th but counted against January's budget.

### 3 · Subcategory budget versioning

Editing a budget does not rewrite history: a new row is created with `valid_from`, the old one is closed with `valid_to`. Stats queries use the date to find the budget that was in effect at that point in time.

```mermaid
sequenceDiagram
    participant U as User
    participant Store as useCategoryStore
    participant Svc as categoryService
    participant DB as PostgreSQL

    Note over DB: {id:1, budget:100, valid_from:2026-01-01, valid_to:null}

    U->>Store: updateSubcategory({ budget: 150 })
    Store->>Svc: updateSubcategory(1, { budget: 150 })
    Svc->>DB: UPDATE SET valid_to = 2026-04-30 WHERE id = 1
    Svc->>DB: INSERT {budget:150, valid_from:2026-05-01, valid_to:null}

    Note over DB: {id:1, budget:100, valid_from:2026-01, valid_to:2026-04}
    Note over DB: {id:2, budget:150, valid_from:2026-05, valid_to:null}

    Note right of DB: Stats January → id:1 → 100€
    Note right of DB: Stats May     → id:2 → 150€
```

### 4 · Virtual recurrences and lazy materialization

Recurring transactions are not persisted in the database by default. On every load, `getDatesInRange()` computes occurrences for the current period and `getOccurrenceKey()` generates a stable identifier. Only unmatched occurrences are shown as "virtual" rows. Persistence only happens when the user checks off an occurrence.

```mermaid
flowchart LR
    subgraph DEF ["Recurring definition"]
        D["start_date · frequency\nday_of_month · accounting_offset"]
    end

    subgraph CALC ["Client-side calculation (virtualTransactions.ts)"]
        C1["getDatesInRange()\nIterates calendar periods\nDay-of-month clamping\nex: Feb 31 → Feb 28"]
        C2["getOccurrenceKey()\nMonthly  → YYYY-MM\nWeekly   → YYYY-W##\nQuarterly→ YYYY-Q#\nYearly   → YYYY"]
    end

    subgraph DISPLAY ["Display"]
        V["Virtual transaction\nnot persisted\nshown in list"]
        M["User checks it off\ninsertMaterializedTransaction()\n→ persisted + recurrence_occurrence"]
    end

    D --> C1 --> C2 --> V --> M
```

### 5 · PostgreSQL RPCs for all aggregations

No stats logic on the frontend. All computed views are SQL functions: `get_subcategory_stats`, `get_variable_daily_remaining`, `recurring_virtual_for_month`, etc. Called via `supabase.rpc()` from the service layer.

### 6 · API key system for external integrations

Deno Edge Functions expose endpoints authenticated via a SHA-256 hash of a user-generated key. This allows adding a transaction from an iOS Shortcuts automation without exposing Supabase credentials.

```mermaid
sequenceDiagram
    participant SC as iOS Shortcuts
    participant EF as Edge Function (Deno)
    participant DB as PostgreSQL RLS

    SC->>EF: POST /add-transaction\nAuthorization: Bearer api_key
    EF->>DB: SELECT user_id FROM user_api_keys\nWHERE key_hash = SHA256(api_key)
    DB-->>EF: user_id found
    EF->>DB: INSERT INTO transactions\n(user_id, name, amount, ...)
    DB-->>EF: Transaction created
    EF-->>SC: 200 OK
```

## SCSS Design System

Tokens are defined in two layers: a primitive palette (never referenced directly in components) and semantic CSS custom properties (the only layer components may use). The token file is **auto-injected** into every `<style lang="scss">` block via `additionalData` in `nuxt.config.ts` — no manual imports needed.

```mermaid
flowchart TD
    subgraph PRIM ["1 · Primitive palette — _tokens.scss\n(never referenced in components)"]
        P1["$p-gray-900: #0f0f11"]
        P2["$p-indigo-400: #818cf8"]
        P3["$p-red-500: #ef4444"]
    end

    subgraph SEM ["2 · Semantic tokens — CSS custom properties"]
        T1["--color-bg"]
        T2["--color-accent"]
        T3["--color-danger"]
        T4["--color-text-primary\n--color-text-muted\n--shadow-sm · --shadow-md\n--transition-fast · ..."]
    end

    subgraph THEME ["3 · Theme switching — useTheme.ts"]
        DARK["data-theme='dark'\n--color-bg: #0f0f11\n--color-accent: #fff\n(default)"]
        LIGHT["data-theme='light'\n--color-bg: #f9f9fb\n--color-accent: #000"]
    end

    subgraph INJECT ["4 · Auto-injection — nuxt.config.ts"]
        NC["vite.css.preprocessorOptions.scss\n  additionalData:\n  @use '~/assets/scss/tokens' as *\n→ available in every style lang=scss\nwithout explicit imports"]
    end

    subgraph COMP ["5 · Inside a Vue component"]
        CO[".card { background: var(--color-bg) }\n.label { color: var(--color-text-muted) }\n.btn   { color: var(--color-accent) }\n\n❌ never: color: $p-gray-900"]
    end

    P1 --> T1
    P2 --> T2
    P3 --> T3
    SEM --> DARK
    SEM --> LIGHT
    SEM --> INJECT
    INJECT --> COMP
    DARK --> COMP
    LIGHT --> COMP
```

## What I Learned / Contributed

The most challenging part was the recurring transactions engine: computing stable virtual occurrences over any arbitrary time window, with day-of-month clamping (e.g., monthly on the 31st → Feb 28/29), while cleanly handling the split between operation date and accounting date. Budget versioning required rethinking the schema so that stats queries are deterministic regardless of which historical period is queried.
