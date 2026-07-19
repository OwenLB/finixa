import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers'

test.beforeEach(async ({ page }) => { await loginAsTestUser(page) })

// B-C1 — la déconnexion doit renvoyer vers la connexion et ne laisser AUCUNE
// donnée du compte précédent accessible (signOutAndReload recharge l'app pour
// purger les stores Pinia en mémoire).
test('la déconnexion renvoie vers /login et ne laisse aucune donnée (B-C1)', async ({ page }) => {
  // Navigation SPA vers la page « Plus » (qui contient le bouton de déconnexion).
  await page.locator('.tab-bar a[href*="more"]').click()
  await expect(page).toHaveURL(/more/)

  await page.locator('.more__logout').click({ timeout: 15_000 })

  // signOutAndReload pose #/login puis recharge → on atterrit sur l'écran de
  // connexion.
  await expect(page).toHaveURL(/login/)
  await expect(page.locator('input[type="email"]')).toBeVisible()

  // Re-naviguer vers une route protégée ne ré-affiche aucune donnée du compte.
  await page.goto('/transactions')
  await expect(page).toHaveURL(/login/)
  await expect(page.getByText('E2E Café')).toHaveCount(0)
})
