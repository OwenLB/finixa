import { type Page, expect } from '@playwright/test'

// Connexion réelle via le formulaire de login.
//
// On se connecte à chaque test plutôt que de réutiliser un storageState : avec
// une session restaurée, le client Supabase peut émettre sa 1re requête AVANT
// d'avoir rattaché le JWT (course d'hydratation) → la lecture des préférences
// revient vide et l'app croit l'onboarding non terminé, puis redirige vers
// /onboarding. Une connexion fraîche établit la session de façon synchrone.
export async function loginAsTestUser(page: Page): Promise<void> {
  // Neutralise le prompt de configuration du PIN (drawer auto-ouvert ~1,5 s après
  // le montage), quel que soit l'id utilisateur : on force la clé « déjà vu » à
  // true au niveau du localStorage avant le chargement de l'app.
  await page.addInitScript(() => {
    const orig = Storage.prototype.getItem
    Storage.prototype.getItem = function (this: Storage, key: string) {
      if (key.startsWith('finixa-pin-shown')) return 'true'
      return orig.call(this, key)
    }
  })

  await page.goto('/')
  await expect(page).toHaveURL(/login/)

  await page.locator('input[type="email"]').fill('e2e@finixa.test')
  await page.locator('input[type="password"]').fill('e2e-password-123')
  await page.locator('button[type="submit"]').click()

  // Connexion réussie → dashboard avec la barre d'onglets (UI authentifiée),
  // sans redirection vers /login ni /onboarding.
  await expect(page).not.toHaveURL(/login|onboarding/)
  await expect(page.locator('.tab-bar')).toBeVisible({ timeout: 15_000 })
}

/** Navigue (SPA) vers un onglet de la barre du bas par fragment d'URL. */
export async function gotoTab(page: Page, hrefFragment: string): Promise<void> {
  await page.locator(`.tab-bar a[href*="${hrefFragment}"]`).click()
}

/**
 * Ajoute une transaction via le formulaire d'ajout puis revient sur un état
 * vérifiable (le champ intitulé est remis à blanc après un submit réussi).
 * `amountDigits` est tapé chiffre par chiffre dans la saisie de centimes
 * (ex. '1500' → 15,00). `income: true` bascule le type sur « Income » (revenu).
 */
export async function addTransaction(
  page: Page,
  opts: { amountDigits: string; label: string; income?: boolean },
): Promise<void> {
  await gotoTab(page, 'add')
  await expect(page).toHaveURL(/add/)

  if (opts.income) {
    // 1er FormSelectInput = Type → ouvre un drawer d'options. On choisit l'option
    // par position (ordre TRANSACTION_TYPES : dépense, revenu, épargne) plutôt que
    // par texte, pour rester indépendant de la langue affichée.
    await page.locator('.cat-selector__group').first().locator('.sel__trigger').click()
    await page.locator('.sel-drawer__item').nth(1).click()
  }

  await page.locator('.amount-input__capture').pressSequentially(opts.amountDigits)
  await page.locator('.tx-form__input').fill(opts.label)
  await page.locator('.add__footer button.app-btn').click()

  // Après un ajout réussi, add.vue réinitialise le formulaire → l'intitulé redevient vide.
  await expect(page.locator('.tx-form__input')).toHaveValue('')
}
