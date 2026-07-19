import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

// Config Vitest. Trois familles de tests :
//  • logique pure (utils, services) — environnement `node` (défaut) ;
//  • composants simples (.vue sans runtime Nuxt) — `happy-dom` activé par fichier
//    via `// @vitest-environment happy-dom` ;
//  • composants à runtime Nuxt (auto-imports, stores, composables) — environnement
//    `nuxt` activé par fichier via `// @vitest-environment nuxt` + `mountSuspended`.
//
// `defineVitestConfig` fournit le plugin Vue + l'environnement `nuxt` ; le défaut
// reste `node`. Les alias reproduisent ceux de Nuxt 4 (~ et @ → app/).
export default defineVitestConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['app/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    // Dummy Supabase credentials so the @nuxtjs/supabase plugin initialises
    // without throwing in `// @vitest-environment nuxt` test files.
    // No real DB calls are made: service functions are mocked in those tests.
    env: {
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_KEY: 'test-anon-key',
    },
  },
})
