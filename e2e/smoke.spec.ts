import { test, expect } from '@playwright/test'

// 1er test E2E (Incrément 4). Smoke sans authentification : un visiteur non
// connecté qui ouvre l'app doit être redirigé vers l'écran de connexion, et le
// formulaire (champ email) doit s'afficher. Prouve que le harnais Playwright +
// le serveur de preview fonctionnent de bout en bout.
test('un visiteur non authentifié est redirigé vers la connexion', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/login/)
  await expect(page.locator('input[type="email"]')).toBeVisible()
})
