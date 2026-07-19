// API standalone de @nuxt/eslint-config (le module @nuxt/eslint n'est pas
// enregistré dans nuxt.config — l'ancien import `withNuxt` n'existait pas
// et cassait toute exécution d'eslint).
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt().append({
  rules: {
    'vue/html-self-closing': ['error', { html: { void: 'always', normal: 'always', component: 'always' } }],
    'no-console': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',

    // Le formulaire `form` est passé en prop puis muté directement par les
    // champs enfants (FormCategorySelector, AmountInput…) — pattern délibéré
    // et généralisé du projet (v-model:xxx sur les sous-champs).
    'vue/no-mutating-props': 'off',
    // Faux positif Vue 3 : les fragments (plusieurs racines de template) sont
    // valides — la règle est conçue pour Vue 2.
    'vue/no-multiple-template-root': 'off',
    // Patterns ponctuels assumés (transition sur composant, prop optionnelle
    // sans défaut, clé dérivée homonyme) — signalés mais non bloquants.
    'vue/require-toggle-inside-transition': 'warn',
    'vue/require-default-prop': 'warn',
    'vue/no-dupe-keys': 'warn',
  },
})
