import { test, expect } from '@playwright/test'
import { loginAsTestUser, gotoTab } from './helpers'

// Transactions récurrentes : créer une définition récurrente (mensuelle) doit
// faire apparaître une occurrence VIRTUELLE dans la liste du mois courant
// (générée par buildVirtualTransactions, badge récurrence).
test.beforeEach(async ({ page }) => { await loginAsTestUser(page) })

test('crée une dépense récurrente → occurrence virtuelle dans la liste', async ({ page }) => {
  const label = `Recurrent ${Date.now()}`

  await gotoTab(page, 'add')
  await page.locator('.amount-input__capture').pressSequentially('2500') // 25,00 €
  await page.locator('.tx-form__input').fill(label)

  // Ouvre la section Options puis active la récurrence (1er toggle des options).
  await page.locator('.tx-form__options-toggle').click()
  await page.locator('.tx-form__options-body .app-toggle').first().click()

  await page.locator('.add__footer button.app-btn').click()
  await expect(page.locator('.tx-form__input')).toHaveValue('') // reset → ajout réussi

  await gotoTab(page, 'transactions')
  const item = page.locator('.tx-item', { hasText: label })
  await expect(item).toBeVisible()
  // Badge d'occurrence récurrente (tx.virtual) — preuve que la récurrence génère
  // bien une occurrence sans transaction réelle matérialisée.
  await expect(item.locator('.tx-item__recurring')).toBeVisible()
})
