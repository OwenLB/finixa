import { test, expect } from '@playwright/test'
import { loginAsTestUser, gotoTab } from './helpers'

// Refactor « identité stable + historique de budget ».
// Créer une sous-catégorie avec un budget, puis MODIFIER ce budget : c'est le
// chemin qui, avant le fix, créait une nouvelle ligne de sous-catégorie (nouvel
// id) et décatégorisait les transactions. Désormais le budget est upserté dans
// subcategory_budgets et l'identité reste stable. Ce test valide le parcours de
// bout en bout contre le nouveau schéma.
test('créer une sous-catégorie avec budget, puis le modifier', async ({ page }) => {
  await loginAsTestUser(page)

  const catName = `E2E Budget ${Date.now()}`

  await gotoTab(page, 'budget')
  await expect(page.locator('.cat-section__add-btn').first()).toBeVisible({ timeout: 15_000 })

  // 1) Créer une catégorie de dépense (sections dans l'ordre : revenu, DÉPENSE, épargne)
  await page.locator('.cat-section__add-btn').nth(1).click()
  await page.locator('input[placeholder="Ex: Alimentation"]').fill(catName)
  await page.getByRole('button', { name: 'Créer la catégorie' }).click()

  const card = page.locator('.cat-card', { hasText: catName })
  await expect(card).toBeVisible()

  // 2) Ajouter une sous-catégorie avec un budget de 100
  await card.locator('.cat-card__add-sub').click()
  await page.locator('input[placeholder="Ex: Courses hebdomadaires"]').fill('Sub E2E')
  await page.locator('.budget-field__no-budget').click()            // désactive « Sans budget »
  await page.locator('input[type="number"]').fill('100')
  await page.getByRole('button', { name: 'Ajouter la sous-catégorie' }).click()

  const subRow = card.locator('.sub-row', { hasText: 'Sub E2E' })
  await expect(subRow.locator('.sub-row__amount')).toContainText('100')

  // 3) Modifier le budget → 50 (upsert d'historique, identité stable, pas de versionnement)
  await subRow.locator('.sub-row__body').click()
  await page.locator('input[type="number"]').fill('50')
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(subRow.locator('.sub-row__amount')).toContainText('50')
})
