import { test, expect } from '@playwright/test'
import { loginAsTestUser, addTransaction, gotoTab } from './helpers'

// Tests auto-suffisants (ajoutent leur propre transaction à un libellé unique)
// pour ne pas dépendre de l'ordre d'exécution ni des données seedées.
test.beforeEach(async ({ page }) => { await loginAsTestUser(page) })

test('édite l’intitulé d’une transaction', async ({ page }) => {
  const label = `Edit ${Date.now()}`
  await addTransaction(page, { amountDigits: '1000', label }) // 10,00 €

  await gotoTab(page, 'transactions')
  await page.locator('.tx-item', { hasText: label }).click()
  await expect(page).toHaveURL(/edit\//)

  const newLabel = `${label} modifie`
  await page.locator('.tx-form__input').fill(newLabel)
  await page.locator('.edit__footer .app-btn--primary').click() // Enregistrer

  await expect(page).toHaveURL(/transactions/)
  await expect(page.locator('.tx-item', { hasText: newLabel })).toBeVisible()
  await expect(page.locator('.tx-item', { hasText: label, hasNotText: 'modifie' })).toHaveCount(0)
})

test('supprime une transaction (confirmation native)', async ({ page }) => {
  const label = `Suppr ${Date.now()}`
  await addTransaction(page, { amountDigits: '700', label }) // 7,00 €

  await gotoTab(page, 'transactions')
  await page.locator('.tx-item', { hasText: label }).click()
  await expect(page).toHaveURL(/edit\//)

  page.once('dialog', d => d.accept()) // confirm() de suppression
  await page.locator('.edit__footer .app-btn--danger').click()

  await expect(page).toHaveURL(/transactions/)
  await expect(page.locator('.tx-item', { hasText: label })).toHaveCount(0)
})
