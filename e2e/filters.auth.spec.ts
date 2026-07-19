import { test, expect } from '@playwright/test'
import { loginAsTestUser, gotoTab } from './helpers'

// S'appuie sur les transactions seedées (scripts/seed-e2e.sh) :
//  • E2E Café    — dépense, mois courant, NON pointée
//  • E2E Salaire — revenu,  mois courant, POINTÉE
//  • E2E Loyer   — dépense, MOIS DERNIER
test.beforeEach(async ({ page }) => { await loginAsTestUser(page) })

test('la recherche filtre la liste par intitulé', async ({ page }) => {
  await gotoTab(page, 'transactions')
  await expect(page.locator('.tx-item', { hasText: 'E2E Café' })).toBeVisible()
  await expect(page.locator('.tx-item', { hasText: 'E2E Salaire' })).toBeVisible()

  await page.locator('.tx-search__input').fill('Café')
  await expect(page.locator('.tx-item', { hasText: 'E2E Café' })).toBeVisible()
  await expect(page.locator('.tx-item', { hasText: 'E2E Salaire' })).toHaveCount(0)

  await page.locator('.tx-search__input').fill('')
  await expect(page.locator('.tx-item', { hasText: 'E2E Salaire' })).toBeVisible()
})

test('le filtre « non pointées » masque les transactions pointées', async ({ page }) => {
  await gotoTab(page, 'transactions')
  await expect(page.locator('.tx-item', { hasText: 'E2E Salaire' })).toBeVisible() // pointée

  await page.locator('.tx-filters__chip').first().click() // bascule « non pointées »

  await expect(page.locator('.tx-item', { hasText: 'E2E Café' })).toBeVisible()      // non pointée → visible
  await expect(page.locator('.tx-item', { hasText: 'E2E Salaire' })).toHaveCount(0)   // pointée → masquée
})

test('la navigation de période change les transactions visibles', async ({ page }) => {
  await gotoTab(page, 'transactions')
  await expect(page.locator('.tx-item', { hasText: 'E2E Café' })).toBeVisible()   // mois courant
  await expect(page.locator('.tx-item', { hasText: 'E2E Loyer' })).toHaveCount(0)  // mois dernier → absent

  await page.locator('.ps__arrow').first().click() // mois précédent
  await expect(page.locator('.tx-item', { hasText: 'E2E Loyer' })).toBeVisible()
})
