import { defineConfig, devices } from '@playwright/test'

// Config Playwright (E2E). L'app est une SPA (ssr: false) en hash router : on la
// sert via `npm run preview` (build statique) sur le port 3000.
//
// Deux familles de tests, toutes en viewport mobile (produit mobile-first) :
//  • « public »        — visiteur non authentifié (placeholders Supabase suffisent).
//  • « authenticated » — parcours réels contre une stack Supabase LOCALE
//    (`supabase start`) avec un utilisateur de test seedé. Chaque test se
//    connecte via le formulaire (session fraîche, cf. e2e/helpers.ts).
//
// SUPABASE_URL / SUPABASE_KEY sont injectés par la CI (depuis `supabase status`)
// au moment du build ; en local on retombe sur des placeholders.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'public',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'authenticated',
      testMatch: /\.auth\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ?? 'https://example.supabase.co',
      SUPABASE_KEY: process.env.SUPABASE_KEY ?? 'sb_publishable_e2e_placeholder',
    },
  },
})
