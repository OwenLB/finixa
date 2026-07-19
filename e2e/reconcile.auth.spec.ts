import { test, expect } from '@playwright/test'
import { loginAsTestUser, addTransaction, gotoTab } from './helpers'

// Réconciliation (pointage) : basculer le statut d'une transaction de
// « non pointée » (pending) à « pointée » (checked). Test auto-suffisant.
test.beforeEach(async ({ page }) => { await loginAsTestUser(page) })

test('pointe une transaction (pending → checked)', async ({ page }) => {
  const label = `Point ${Date.now()}`
  await addTransaction(page, { amountDigits: '800', label }) // 8,00 €, pending par défaut

  await gotoTab(page, 'transactions')
  const item = page.locator('.tx-item', { hasText: label })
  await expect(item).toBeVisible()

  // Pas encore pointée
  await expect(item.locator('.tx-item__status-btn--checked')).toHaveCount(0)

  // Le bouton de statut bascule le pointage (sans ouvrir l'édition — @click.stop)
  await item.locator('.tx-item__status-btn').click()

  // Désormais pointée
  await expect(item.locator('.tx-item__status-btn--checked')).toBeVisible()
})

test('le pointage retire la transaction du filtre « non pointées »', async ({ page }) => {
  const label = `PointFiltre ${Date.now()}`
  await addTransaction(page, { amountDigits: '900', label })

  await gotoTab(page, 'transactions')
  const item = page.locator('.tx-item', { hasText: label })
  await item.locator('.tx-item__status-btn').click()
  await expect(item.locator('.tx-item__status-btn--checked')).toBeVisible()

  // Filtre « non pointées » → la transaction pointée disparaît
  await page.locator('.tx-filters__chip').first().click()
  await expect(page.locator('.tx-item', { hasText: label })).toHaveCount(0)
})
