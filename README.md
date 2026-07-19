# Finixa

**Ajouter une dépense en moins de cinq secondes depuis son téléphone** — l'app de finances personnelles mobile-first construite autour de cette seule contrainte.

[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20RLS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-iOS%2FAndroid-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![App](https://img.shields.io/badge/app-app.finixa.net-000000)](https://app.finixa.net/)

**[→ App (app.finixa.net)](https://app.finixa.net/)** · **[→ Landing (finixa.net)](https://finixa.net/)** · **[→ Étude de cas complète sur mon portfolio](https://owenlebec.fr/projects/finixa)**

---

## Contexte

Finixa est une app de finances personnelles en usage réel au quotidien, centrée sur une contrainte UX précise : **ajouter une dépense le plus vite possible depuis un mobile**. Elle couvre le suivi de dépenses et revenus, la gestion de budgets par catégorie et sous-catégorie, le budget par enveloppe (50/30/20), les transactions récurrentes virtuelles, et des statistiques mensuelles calculées via des RPCs PostgreSQL. L'app est packagée pour iOS/Android via Capacitor en plus du déploiement web, et continue d'évoluer activement.

## Fonctionnalités clés

- Ajout de transaction en quelques secondes, montants signés en base (`-50` = dépense, `+1000` = revenu)
- Budgets par catégorie et sous-catégorie, avec historique versionné (voir plus bas)
- Budget par enveloppe (méthode 50/30/20)
- Transactions récurrentes calculées virtuellement, matérialisées seulement quand l'utilisateur les valide
- Statistiques mensuelles agrégées côté PostgreSQL (aucune logique de stats côté client)
- Import CSV côté client (PapaParse)
- Ajout de transaction externe via clé API (ex. raccourci iOS Shortcuts)
- Digest quotidien et push notifications via Edge Functions
- Localisation complète FR/EN
- Packaging iOS/Android via Capacitor, avec verrouillage par PIN et stockage sécurisé local

## Stack technique

| Techno | Rôle |
|---|---|
| Nuxt 4 + Vue 3 (SPA, hash routing) | SSR désactivé intentionnellement — le hash routing est requis pour la compatibilité Capacitor (`capacitor://` ne supporte pas le push-state routing) |
| TypeScript strict | `TransactionType ('depense' \| 'revenu' \| 'epargne')` comme discriminant central, de la base jusqu'aux composants |
| Pinia (15 stores) | Architecture en trois couches : `app/services/` isole Supabase, les stores détiennent l'état, les composants consomment les stores |
| Supabase (PostgreSQL + Auth + RLS) | Row Level Security sur toutes les tables ; vues calculées exposées en RPCs PostgreSQL |
| Edge Functions (Deno) | 4 fonctions serverless : ajout de transaction par clé API, digest quotidien, push notifications, listing de catégories |
| SCSS custom (design system par tokens) | Pas de Tailwind — tokens auto-injectés dans chaque composant via `additionalData` |
| Capacitor 8 | Packaging iOS/Android, `@capacitor/preferences` pour le stockage local sécurisé |
| @nuxtjs/i18n | FR/EN, stratégie `no_prefix` compatible hash routing |

## Architecture

### Vue d'ensemble

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

### Récurrences virtuelles et matérialisation lazy

Les transactions récurrentes ne sont pas persistées en base par défaut. À chaque chargement, `getDatesInRange()` calcule les occurrences sur la période et `getOccurrenceKey()` génère un identifiant stable ; seules les occurrences non encore enregistrées sont affichées comme "virtuelles". La persistance n'a lieu que lorsque l'utilisateur coche une occurrence. `getDatesInRange()` gère le clamping des jours-du-mois (ex. mensuel le 31 → 28 fév.) et tous les cas limites de fréquences hebdomadaires, trimestrielles et annuelles.

```mermaid
flowchart LR
    subgraph DEF ["Définition récurrente"]
        D["start_date · frequency\nday_of_month · accounting_offset"]
    end

    subgraph CALC ["Calcul client — virtualTransactions.ts"]
        C1["getDatesInRange()\nItère les périodes du mois\nClamping jour-du-mois\nex: 31 fév → 28"]
        C2["getOccurrenceKey()\nMensuel   → YYYY-MM\nHebdo     → YYYY-W##\nTrimestr  → YYYY-Q#\nAnnuel    → YYYY"]
    end

    subgraph DISPLAY ["Affichage & persistance"]
        V["Transaction virtuelle\nnon persistée\naffichée dans la liste"]
        M["Utilisateur coche\ninsertMaterializedTransaction()\n→ persistée + recurrence_occurrence"]
    end

    D --> C1 --> C2 --> V --> M
```

### Versioning des budgets de sous-catégories

Modifier un budget ne réécrit pas l'historique : une nouvelle ligne est créée avec `valid_from`, l'ancienne est fermée avec `valid_to`. Les requêtes de stats utilisent la date pour trouver le budget en vigueur à cette époque — les statistiques de janvier restent exactes même si le budget a changé en mai.

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

D'autres schémas (flux d'ajout de transaction, décalage date d'opération/date comptable, authentification par clé API, design system SCSS) sont disponibles dans l'[étude de cas complète](https://owenlebec.fr/projects/finixa).

## Points techniques notables

- **Trois couches strictes** — aucun appel Supabase direct dans un composant : composants → stores → services → Supabase, sans exception.
- **RPCs PostgreSQL pour toutes les agrégations** — aucune logique de stats côté front ; `get_subcategory_stats`, `get_variable_daily_remaining`, `recurring_virtual_for_month`, etc. sont des fonctions SQL appelées via `supabase.rpc()`.
- **Récurrences virtuelles** — la partie la plus complexe du projet : occurrences calculées à la volée sur n'importe quelle fenêtre temporelle, avec clamping des jours-du-mois, matérialisées seulement quand l'utilisateur les valide.
- **Versioning des budgets** — repenser le schéma pour que les requêtes de stats restent déterministes quelle que soit la période historique interrogée, sans jamais réécrire une ligne existante.
- **Date d'opération vs date comptable** — chaque transaction a une `date` et une `accounting_date` nullable ; pour les récurrentes en `accounting_offset: 'next_month'`, la date comptable est fixée au 1er du mois suivant à la matérialisation (un prélèvement le 28 décembre compte sur le budget de janvier).
- **Authentification par clé API** — les Edge Functions exposent des endpoints authentifiés par SHA-256 d'une clé générée par l'utilisateur, pour ajouter une transaction depuis un raccourci iOS Shortcuts sans exposer les credentials Supabase.
- **Design system SCSS par tokens** — palette primitive jamais référencée directement dans les composants ; seules des propriétés CSS sémantiques (`--color-bg`, `--color-accent`, ...) y sont utilisées, auto-injectées via `additionalData` dans `nuxt.config.ts`.

## Cloner et lancer en local

Prérequis : **Node.js 20+**, un projet [Supabase](https://supabase.com) (gratuit).

```bash
git clone https://github.com/OwenLB/finixa.git
cd finixa
npm install
```

Copier `.env.example` en `.env` et renseigner les variables :

```env
SUPABASE_URL=https://<project-ref>.supabase.co   # URL du projet Supabase
SUPABASE_KEY=sb_publishable_...                   # Clé publishable (anon), côté client
SUPABASE_SECRET_KEY=sb_secret_...                 # Clé secrète (service role), utilisée côté serveur par les routes Nitro server/api/api-key/*
VITE_VAPID_PUBLIC_KEY=                            # Clé publique VAPID pour les push notifications (optionnel)
RESEND_API_KEY=                                   # Clé API Resend, emails transactionnels (optionnel en local)
```

```bash
npm run dev         # Serveur de dev — http://localhost:3000
npm run build        # Build production
npm run generate      # Génération statique (requis avant Capacitor)
npm run test          # Tests unitaires/composants (Vitest)
npm run test:e2e      # Tests end-to-end (Playwright)
npm run cap:ios       # nuxt generate + cap sync + ouverture Xcode
```

Un site vitrine séparé (Astro, déployé sur [finixa.net](https://finixa.net/)) vit dans `landing/` — voir `landing/README.md`.

## Structure du projet

```
app/
  pages/          → 13 pages (dashboard, transactions, add, budget, onboarding, ...)
  components/      → add/ · categories/ · dashboard/ · transactions/ · ui/ · favorites/ · recurring/ · savings/
  composables/      → useRecurringActions, useCategorizationQueue, useAppLock, useTheme, ...
  stores/           → 15 stores Pinia (données + UI), voir architecture ci-dessus
  services/         → couche d'accès Supabase, un fichier par domaine
  utils/            → virtualTransactions, groupByDate, formatCurrency, csvParser, ...
server/api/         → /api/api-key (status, generate, revoke)
supabase/            → migrations SQL, RPCs, policies RLS
landing/             → site vitrine Astro séparé (finixa.net)
ios/                 → projet Xcode généré par Capacitor
e2e/                 → tests Playwright
```

## Voir le projet en contexte

Cette étude de cas détaille les choix produit, l'architecture complète et des captures d'écran : **[owenlebec.fr/projects/finixa](https://owenlebec.fr/projects/finixa)**

Plus de projets sur [owenlebec.fr](https://owenlebec.fr).
