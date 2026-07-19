import type { TransactionType, EnvelopeKey } from '~/types'
import type { TemplateCategoryInput } from '~/services/categoryService'

export interface TemplateSubcategory {
  name:     string
  /** Part du revenu mensuel net (fraction, ex. 0.25 = 25 %). */
  pct:      number
  envelope: EnvelopeKey | null
}

export interface TemplateCategory {
  name:          string
  type:          TransactionType
  iconKey:       string
  color:         string
  subcategories: TemplateSubcategory[]
}

export interface OnboardingTemplate {
  id:          string
  label:       string
  iconKey:     string
  color:       string
  description: string
  categories:  TemplateCategory[]
}

export const TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'etudiant', label: 'Étudiant', iconKey: 'graduation-cap', color: '#eab308',
    description: 'Petit budget, grandes ambitions',
    categories: [
      {
        name: 'Logement', type: 'depense', iconKey: 'home', color: '#f97316',
        subcategories: [
          { name: 'Loyer',   pct: 0.45, envelope: 'needs' },
          { name: 'Charges', pct: 0.05, envelope: 'needs' },
        ],
      },
      {
        name: 'Alimentation', type: 'depense', iconKey: 'shopping-cart', color: '#22c55e',
        subcategories: [
          { name: 'Courses',    pct: 0.15, envelope: 'needs' },
          { name: 'Restaurant', pct: 0.05, envelope: 'wants' },
        ],
      },
      {
        name: 'Transports', type: 'depense', iconKey: 'train', color: '#3b82f6',
        subcategories: [
          { name: 'Transports en commun', pct: 0.08, envelope: 'needs' },
        ],
      },
      {
        name: 'Loisirs', type: 'depense', iconKey: 'gamepad', color: '#a855f7',
        subcategories: [
          { name: 'Sorties',   pct: 0.05, envelope: 'wants' },
          { name: 'Streaming', pct: 0.02, envelope: 'wants' },
        ],
      },
      {
        name: 'Études', type: 'depense', iconKey: 'graduation-cap', color: '#eab308',
        subcategories: [
          { name: 'Fournitures', pct: 0.02, envelope: 'needs' },
          { name: 'Livres',      pct: 0.02, envelope: 'needs' },
        ],
      },
    ],
  },
  {
    id: 'employe', label: 'Salarié', iconKey: 'briefcase', color: '#6366f1',
    description: 'Revenus stables, budget maîtrisé',
    categories: [
      {
        name: 'Logement', type: 'depense', iconKey: 'home', color: '#f97316',
        subcategories: [
          { name: 'Loyer',   pct: 0.25, envelope: 'needs' },
          { name: 'Charges', pct: 0.04, envelope: 'needs' },
        ],
      },
      {
        name: 'Alimentation', type: 'depense', iconKey: 'shopping-cart', color: '#22c55e',
        subcategories: [
          { name: 'Courses',    pct: 0.12, envelope: 'needs' },
          { name: 'Restaurant', pct: 0.05, envelope: 'wants' },
        ],
      },
      {
        name: 'Transports', type: 'depense', iconKey: 'car', color: '#3b82f6',
        subcategories: [
          { name: 'Carburant', pct: 0.04, envelope: 'needs' },
          { name: 'Assurance', pct: 0.03, envelope: 'needs' },
        ],
      },
      {
        name: 'Santé', type: 'depense', iconKey: 'heart', color: '#ef4444',
        subcategories: [
          { name: 'Médecin',   pct: 0.01, envelope: 'needs' },
          { name: 'Pharmacie', pct: 0.01, envelope: 'needs' },
        ],
      },
      {
        name: 'Loisirs', type: 'depense', iconKey: 'gamepad', color: '#a855f7',
        subcategories: [
          { name: 'Sorties',   pct: 0.04, envelope: 'wants' },
          { name: 'Streaming', pct: 0.01, envelope: 'wants' },
        ],
      },
      {
        name: 'Abonnements', type: 'depense', iconKey: 'phone', color: '#6366f1',
        subcategories: [
          { name: 'Téléphone', pct: 0.01, envelope: 'needs' },
          { name: 'Internet',  pct: 0.01, envelope: 'needs' },
        ],
      },
      {
        name: 'Épargne', type: 'epargne', iconKey: 'piggy-bank', color: '#14b8a6',
        subcategories: [
          { name: 'Livret A', pct: 0.10, envelope: 'savings' },
        ],
      },
    ],
  },
  {
    id: 'famille', label: 'Famille', iconKey: 'users', color: '#22c55e',
    description: 'Budget familial complet',
    categories: [
      {
        name: 'Logement', type: 'depense', iconKey: 'home', color: '#f97316',
        subcategories: [
          { name: 'Loyer',   pct: 0.28, envelope: 'needs' },
          { name: 'Charges', pct: 0.04, envelope: 'needs' },
        ],
      },
      {
        name: 'Alimentation', type: 'depense', iconKey: 'shopping-cart', color: '#22c55e',
        subcategories: [
          { name: 'Courses',    pct: 0.15, envelope: 'needs' },
          { name: 'Restaurant', pct: 0.04, envelope: 'wants' },
        ],
      },
      {
        name: 'Enfants', type: 'depense', iconKey: 'graduation-cap', color: '#eab308',
        subcategories: [
          { name: 'Garde / école', pct: 0.10, envelope: 'needs' },
          { name: 'Activités',     pct: 0.03, envelope: 'wants' },
        ],
      },
      {
        name: 'Santé', type: 'depense', iconKey: 'heart', color: '#ef4444',
        subcategories: [
          { name: 'Médecin',   pct: 0.01, envelope: 'needs' },
          { name: 'Pharmacie', pct: 0.01, envelope: 'needs' },
        ],
      },
      {
        name: 'Transports', type: 'depense', iconKey: 'car', color: '#3b82f6',
        subcategories: [
          { name: 'Carburant', pct: 0.04, envelope: 'needs' },
          { name: 'Assurance', pct: 0.03, envelope: 'needs' },
        ],
      },
      {
        name: 'Épargne', type: 'epargne', iconKey: 'piggy-bank', color: '#14b8a6',
        subcategories: [
          { name: 'Livret A', pct: 0.08, envelope: 'savings' },
        ],
      },
    ],
  },
  {
    id: 'freelance', label: 'Freelance', iconKey: 'laptop', color: '#3b82f6',
    description: 'Revenus variables, indépendant',
    categories: [
      {
        name: 'Logement', type: 'depense', iconKey: 'home', color: '#f97316',
        subcategories: [
          { name: 'Loyer',   pct: 0.22, envelope: 'needs' },
          { name: 'Charges', pct: 0.03, envelope: 'needs' },
        ],
      },
      {
        name: 'Alimentation', type: 'depense', iconKey: 'shopping-cart', color: '#22c55e',
        subcategories: [
          { name: 'Courses',    pct: 0.10, envelope: 'needs' },
          { name: 'Restaurant', pct: 0.05, envelope: 'wants' },
        ],
      },
      {
        name: 'Pro', type: 'depense', iconKey: 'laptop', color: '#3b82f6',
        subcategories: [
          { name: 'Matériel',  pct: 0.03, envelope: 'needs' },
          { name: 'Logiciels', pct: 0.02, envelope: 'needs' },
          { name: 'Formation', pct: 0.02, envelope: 'wants' },
        ],
      },
      {
        name: 'Impôts & Charges', type: 'depense', iconKey: 'briefcase', color: '#eab308',
        subcategories: [
          { name: 'Charges sociales', pct: 0.20, envelope: 'needs' },
        ],
      },
      {
        name: 'Transports', type: 'depense', iconKey: 'car', color: '#60a5fa',
        subcategories: [
          { name: 'Transport', pct: 0.03, envelope: 'needs' },
        ],
      },
      {
        name: 'Épargne', type: 'epargne', iconKey: 'piggy-bank', color: '#14b8a6',
        subcategories: [
          { name: 'Retraite', pct: 0.06, envelope: 'savings' },
          { name: 'Urgences', pct: 0.05, envelope: 'savings' },
        ],
      },
    ],
  },
  {
    id: 'custom', label: 'Personnalisé', iconKey: 'star', color: '#f97316',
    description: 'Je configure mes propres catégories',
    categories: [],
  },
]

/**
 * Construit la charge utile de création de catégories pour un profil, avec les
 * budgets **mis à l'échelle du revenu** (`budget = revenu × pct`, arrondi).
 * Sans revenu, les catégories sont créées sans budget (suivi simple).
 *
 * Une catégorie "Revenus > Salaire" (= 100 % du revenu) est ajoutée en tête si
 * le profil a des catégories et qu'un revenu > 0 a été saisi.
 */
export function buildOnboardingDraft(templateId: string, income: number | null): TemplateCategoryInput[] {
  const tpl = TEMPLATES.find(t => t.id === templateId)
  const hasIncome = !!income && income > 0
  const toBudget = (pct: number) => (hasIncome ? Math.round(income! * pct) : null)

  const draft: TemplateCategoryInput[] = (tpl?.categories ?? []).map(cat => ({
    name:    cat.name,
    type:    cat.type,
    iconKey: cat.iconKey,
    color:   cat.color,
    subcategories: cat.subcategories.map(sub => ({
      name:     sub.name,
      budget:   toBudget(sub.pct),
      envelope: sub.envelope,
    })),
  }))

  if (draft.length > 0 && hasIncome) {
    draft.unshift({
      name: 'Revenus', type: 'revenu', iconKey: 'wallet', color: '#34d399',
      subcategories: [{ name: 'Salaire', budget: income!, envelope: null }],
    })
  }

  return draft
}
