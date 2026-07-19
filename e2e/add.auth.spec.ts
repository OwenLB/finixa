import { test, expect } from '@playwright/test'
import { loginAsTestUser, addTransaction, gotoTab } from './helpers'

// Parcours cœur produit : « ajouter une dépense le plus vite possible ».
test.beforeEach(async ({ page }) => { await loginAsTestUser(page) })

test('ajoute une dépense — apparaît en négatif dans la liste', async ({ page }) => {
  const label = `Depense ${Date.now()}`
  await addTransaction(page, { amountDigits: '1234', label }) // 12,34 €

  await gotoTab(page, 'transactions')
  const item = page.locator('.tx-item', { hasText: label })
  await expect(item).toBeVisible()
  // Dépense ⇒ montant signé négatif (discriminant dep>>revenu).
  await expect(item.locator('.tx-item__amount--negative')).toBeVisible()
})

test('ajoute un revenu — apparaît en positif dans la liste', async ({ page }) => {
  const label = `Revenu ${Date.now()}`
  await addTransaction(page, { amountDigits: '5000', label, income: true }) // 50,00 €

  await gotoTab(page, 'transactions')
  const item = page.locator('.tx-item', { hasText: label })
  await expect(item).toBeVisible()
  await expect(item.locator('.tx-item__amount--positive')).toBeVisible()
})
