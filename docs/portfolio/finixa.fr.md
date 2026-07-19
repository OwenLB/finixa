---
title: 'Finixa'
type: "Projet Personnel"
description: "Application web mobile-first de gestion de finances personnelles — suivi de dépenses, budgets par enveloppe et transactions récurrentes."
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

## Contexte

Finixa est un MVP de SaaS de finances personnelles centré sur une contrainte UX précise : **ajouter une dépense le plus vite possible depuis un mobile**. Le projet couvre le suivi de dépenses et revenus, la gestion de budgets par catégorie et sous-catégorie, le budget par enveloppe (50/30/20), les transactions récurrentes virtuelles, et des statistiques mensuelles avec RPCs PostgreSQL. L'app est packagée pour iOS/Android via Capacitor en plus du déploiement web.

## Stack & Architecture

- **Nuxt 4 + Vue 3 (SPA, hash routing)** — SSR désactivé intentionnellement : le hash routing est nécessaire pour la compatibilité Capacitor, le protocole `capacitor://` ne supportant pas le push-state routing.
- **TypeScript strict** — Les montants sont signés en base (`-50` = dépense, `+1000` = revenu). Le discriminant central est `TransactionType ('depense' | 'revenu' | 'epargne')`, utilisé de la base de données jusqu'aux composants.
- **Pinia (15 stores)** — Architecture en trois couches : `app/services/` isole les appels Supabase, les stores détiennent l'état et exposent les mutations, les pages et composants consomment les stores. Aucun appel Supabase direct dans les composants.
- **Supabase (PostgreSQL + Auth + RLS)** — Row Level Security sur toutes les tables. Les vues calculées (stats, récurrences virtuelles) sont des RPCs PostgreSQL appelées directement depuis les services.
- **Edge Functions (Deno)** — Quatre fonctions pour les intégrations externes : ajout rapide de transaction via API key, digest quotidien, push notifications, listing de catégories.
- **SCSS custom (design system par tokens)** — Pas de Tailwind. Les tokens sont auto-injectés dans chaque composant via `additionalData` dans `nuxt.config`. Les composants utilisent uniquement des CSS custom properties sémantiques.
- **Capacitor 8** — Packaging iOS/Android, `@capacitor/preferences` pour le stockage local sécurisé (PIN, thème, onboarding).
- **@nuxtjs/i18n** — Localisation complète FR/EN, stratégie `no_prefix` compatible hash routing.

## Architecture détaillée

```mermaid
flowchart TD
    subgraph MOBILE ["Mobile — Capacitor 8"]
        IOS["iOS App\n(nuxt generate → cap sync → Xcode)"]
        PREF["@capacitor/preferences\nPIN · thème · état onboarding"]
    end

    subgraph CLIENT ["Client — Nuxt 4 · Vue 3 · TypeScript · SPA · hash routing"]
        PAGES["Pages 13\ndashboard · transactions · add · budget\nmore · login · register · onboarding · confirm · ..."]
        COMPONENTS["Composants 107\nadd/ · categories/ · dashboard/ · transactions/\nui/ · favorites/ · recurring/ · savings/ · categorization/"]
        COMPOSABLES["Composables 17\nuseRecurringActions · useCategorizationQueue\nuseInsightData · useAppLock · useTheme\nuseCsvImport · usePullToRefresh · useKeyboardShortcuts · ..."]
        STORES_D["Pinia — Stores données\nuseTransactionStore · useCategoryStore\nuseRecurringStore · useFavoriteStore\nuseEnvelopeStore · useSavingsGoalStore\nuseCategoryStatsStore · useDashboardStore"]
        STORES_UI["Pinia — Stores UI\nusePreferencesStore · usePeriodStore\nuseFilterStore · useSelectionStore\nuseBiometricStore · useCurrencyStore"]
        SERVICES["Services 10\ntransactionService · categoryService · recurringService\ncategoryStatsService · dashboardService\npreferenceService · envelopeService · favoriteService · ..."]
        UTILS["Utils 14\nvirtualTransactions · groupByDate · period\nformatCurrency · csvParser · categoryIcon · ..."]
        I18N["i18n — FR + EN\n~20 KB chacun"]
        SCSS_TK["SCSS tokens\nauto-injectés via additionalData"]
    end

    subgraph NUXT_API ["Nuxt Server API"]
        APIKEY_RT["/api/api-key\nstatus · generate · revoke"]
    end

    subgraph SUPABASE ["Supabase"]
        SB_AUTH["Auth\nJWT · cookie 30j · key: finixa-auth\nredirect → /login · /confirm"]
        SB_DB[("PostgreSQL + RLS\ntransactions · categories · subcategories\nrecurring_transactions · user_preferences\nbudget_envelopes · savings_goals · favorites\npush_subscriptions · user_api_keys")]
        SB_RPC["RPCs PostgreSQL\nget_dashboard_month · get_subcategory_stats\nget_category_spent · get_variable_daily_remaining\nrecurring_virtual_for_month · get_envelope_stats · ..."]
        SB_EF["Edge Functions — Deno\nadd-transaction · user-categories\ndaily-digest · test-notification"]
    end

    subgraph EXTERN ["Intégrations externes"]
        EXT_SC["iOS Shortcuts / Webhooks\nAPI Key SHA-256"]
        EXT_PUSH["Web Push API"]
        EXT_CSV["Import CSV — PapaParse\nclient-side uniquement"]
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

## Points techniques notables

### 1 · Flux d'ajout de transaction

Du tap sur le bouton jusqu'à la mise à jour réactive de l'interface — la séparation des couches en action.

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant AP as useAddPanel
    participant Form as add.vue
    participant Store as useTransactionStore
    participant Svc as transactionService
    participant SB as Supabase RLS

    U->>AP: tap bouton "+"
    AP->>Form: isOpen = true
    Form-->>U: drawer animé depuis le bas
    U->>Form: saisit montant, catégorie, date
    Form->>Store: add(transactionForm)
    Store->>Svc: insertTransaction(form, userId)
    Svc->>SB: INSERT INTO transactions WHERE user_id = auth.uid()
    SB-->>Svc: Transaction créée
    Svc-->>Store: Transaction
    Store->>Store: transactions.unshift(new)
    Store-->>Form: loading = false
    Form-->>U: drawer fermé + toast succès
```

### 2 · Date d'opération vs date comptable

Chaque transaction a une `date` (quand l'opération a lieu) et une `accounting_date` (nullable, quand elle est imputée au budget). Pour les récurrentes avec `accounting_offset: 'next_month'`, la date comptable est fixée au 1er du mois suivant lors de la matérialisation.

```mermaid
flowchart LR
    subgraph STD ["Mode standard — accounting_offset: same_month"]
        A1["Prélèvement le 15 janv."] --> B1["date = 2026-01-15\naccounting_date = null"]
        B1 --> C1["Imputé sur : Janvier"]
    end

    subgraph DEC ["Mode décalé — accounting_offset: next_month"]
        A2["Prélèvement récurrent\nle 28 janv."] --> B2["date = 2026-01-28"]
        B2 --> C2["À la matérialisation :\naccounting_date = 2026-02-01"]
        C2 --> D2["Imputé sur : Février"]
    end
```

Cas d'usage concret : un abonnement prélevé le 28 décembre mais comptabilisé sur le budget de janvier.

### 3 · Versioning des budgets de sous-catégories

Modifier un budget ne réécrit pas l'historique : une nouvelle ligne est créée avec `valid_from`, l'ancienne est fermée avec `valid_to`. Les requêtes de stats utilisent la date pour trouver le budget en vigueur à cette époque.

```mermaid
sequenceDiagram
    participant U as Utilisateur
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

    Note right of DB: Stats Janvier → id:1 → 100€
    Note right of DB: Stats Mai    → id:2 → 150€
```

### 4 · Récurrences virtuelles et matérialisation lazy

Les transactions récurrentes ne sont pas persistées en base par défaut. À chaque chargement, `getDatesInRange()` calcule les occurrences sur la période et `getOccurrenceKey()` génère un identifiant stable. Seules les occurrences non encore enregistrées sont affichées comme "virtuelles". La persistance n'a lieu que lorsque l'utilisateur coche une occurrence.

```mermaid
flowchart LR
    subgraph DEF ["Définition récurrente"]
        D["start_date · frequency\nday_of_month · accounting_offset"]
    end

    subgraph CALC ["Calcul client (virtualTransactions.ts)"]
        C1["getDatesInRange()\nItère les périodes du mois\nClamping jour-du-mois\nex: 31 fév → 28"]
        C2["getOccurrenceKey()\nMensuel  → YYYY-MM\nHebdo    → YYYY-W##\nTrimestr → YYYY-Q#\nAnnuel   → YYYY"]
    end

    subgraph DISPLAY ["Affichage"]
        V["Transaction virtuelle\nnon persistée\naffichée dans la liste"]
        M["Utilisateur coche\ninsertMaterializedTransaction()\n→ persistée + recurrence_occurrence"]
    end

    D --> C1 --> C2 --> V --> M
```

### 5 · RPCs PostgreSQL pour toutes les agrégations

Aucune logique de stats côté front. Toutes les vues calculées sont des fonctions SQL : `get_subcategory_stats`, `get_variable_daily_remaining`, `recurring_virtual_for_month`, etc. Appelées via `supabase.rpc()` depuis les services.

### 6 · Système d'API key pour intégrations externes

Les Edge Functions Deno exposent des endpoints authentifiés par SHA-256 d'une clé générée par l'utilisateur. Permet d'ajouter une transaction depuis un raccourci iOS Shortcuts sans exposer les credentials Supabase.

```mermaid
sequenceDiagram
    participant SC as iOS Shortcuts
    participant EF as Edge Function (Deno)
    participant DB as PostgreSQL RLS

    SC->>EF: POST /add-transaction\nAuthorization: Bearer <api_key>
    EF->>DB: SELECT user_id FROM user_api_keys\nWHERE key_hash = SHA256(api_key)
    DB-->>EF: user_id trouvé
    EF->>DB: INSERT INTO transactions\n(user_id, name, amount, ...)
    DB-->>EF: Transaction créée
    EF-->>SC: 200 OK
```

## Design system SCSS

Les tokens sont définis en deux couches : palette primitive (jamais utilisée directement dans les composants) et propriétés CSS sémantiques (seules utilisées dans les composants). Le fichier de tokens est **auto-injecté** dans chaque `<style lang="scss">` via `additionalData` dans `nuxt.config.ts` — aucun import manuel nécessaire.

```mermaid
flowchart TD
    subgraph PRIM ["1 · Palette primitive — _tokens.scss\n(jamais référencée dans les composants)"]
        P1["$p-gray-900: #0f0f11"]
        P2["$p-indigo-400: #818cf8"]
        P3["$p-red-500: #ef4444"]
    end

    subgraph SEM ["2 · Tokens sémantiques — CSS custom properties"]
        T1["--color-bg"]
        T2["--color-accent"]
        T3["--color-danger"]
        T4["--color-text-primary\n--color-text-muted\n--shadow-sm · --shadow-md\n--transition-fast · ..."]
    end

    subgraph THEME ["3 · Theme switching — useTheme.ts"]
        DARK["data-theme='dark'\n--color-bg: #0f0f11\n--color-accent: #fff\n(défaut)"]
        LIGHT["data-theme='light'\n--color-bg: #f9f9fb\n--color-accent: #000"]
    end

    subgraph INJECT ["4 · Auto-injection — nuxt.config.ts"]
        NC["vite.css.preprocessorOptions.scss\n  additionalData:\n  @use '~/assets/scss/tokens' as *\n→ disponible dans tout style lang=scss\nsans import explicite"]
    end

    subgraph COMP ["5 · Dans un composant Vue"]
        CO[".card { background: var(--color-bg) }\n.label { color: var(--color-text-muted) }\n.btn   { color: var(--color-accent) }\n\n❌ jamais : color: $p-gray-900"]
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

## Ce que j'ai appris / apporté

La partie la plus complexe a été la logique de récurrences : calculer des occurrences virtuelles stables sur n'importe quelle fenêtre temporelle, avec clamping des jours (ex. mensuel le 31 → 28 fév.), tout en gérant la désynchronisation entre date d'opération et date comptable. Le versioning des budgets en base a nécessité de repenser le schéma pour que les requêtes de stats soient déterministes quelle que soit la période interrogée.
