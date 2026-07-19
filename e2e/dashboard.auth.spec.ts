import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers'

// Parcours authentifiés contre la stack Supabase locale. Chaque test se connecte
// puis navigue en SPA (sans rechargement) pour garder la session attachée.
test.beforeEach(async ({ page }) => { await loginAsTestUser(page) })

test('le dashboard est accessible une fois connecté', async ({ page }) => {
  await expect(page).not.toHaveURL(/login|onboarding/)
  await expect(page.locator('.tab-bar')).toBeVisible()
})

test('la transaction seedée apparaît dans la liste', async ({ page }) => {
  // Navigation SPA via la barre d'onglets (pas de page.goto → pas de rechargement).
  await page.locator('.tab-bar a[href*="transactions"]').click()
  await expect(page).toHaveURL(/transactions/)
  // « E2E Café » est inséré par scripts/seed-e2e.sh, daté du mois courant.
  await expect(page.getByText('E2E Café')).toBeVisible({ timeout: 15_000 })
})
