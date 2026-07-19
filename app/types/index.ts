// ============================================================
// TRANSACTION TYPE
// ============================================================

export type TransactionType = 'depense' | 'revenu' | 'epargne'

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'depense', label: 'Dépense' },
  { value: 'revenu',  label: 'Revenu'  },
  { value: 'epargne', label: 'Épargne' },
]

// ============================================================
// BUDGET & DASHBOARD
// ============================================================

export type ViewMode = 'depense' | 'restant'

export interface MonthlyTypeStat {
  type:   TransactionType
  spent:  number
  budget: number
}

export interface FinancialCategory {
  label:  string
  amount: number
  budget: number
  color:  string
  type:   TransactionType
  excludedAmount?: number   // part « exclue des calculs » (désépargne) — segment rouge
}

export interface BudgetSummary {
  budget: number
  spent:  number
}

// ============================================================
// RECURRING EXPENSES
// ============================================================

export type RecurringFrequency = 'monthly' | 'weekly' | 'quarterly' | 'yearly'
export type AccountingOffset = 'same_month' | 'next_month'

export interface RecurringExpense {
  id:               string
  name:             string
  amount:           number
  type:             TransactionType
  category:         string
  categorized:      boolean
  frequency:        RecurringFrequency
  dayOfMonth:       number | null
  startDate:        string
  endDate:          string | null
  accountingOffset: AccountingOffset
}

// ============================================================
// FORMS
// ============================================================

export interface TransactionForm {
  amount:           number
  label:            string
  note:             string
  date:             string
  accountingDate:   string          // '' = pas de date comptable manuelle
  recurring:        boolean
  frequency:        RecurringFrequency
  recurringEndDate: string          // '' = pas de fin
  accountingOffset: AccountingOffset
  type:             TransactionType
  category:         string          // nom de la catégorie parente (affichage)
  categoryId:       string          // UUID catégorie parente
  subcategory:      string          // nom de la sous-catégorie (affichage)
  subcategoryId:    string          // UUID sous-catégorie (prioritaire pour le stockage en DB)
  horsBudget:       boolean         // exclut la tx des stats et du budget mensuel
}

// ============================================================
// CATEGORIES
// ============================================================

export type EnvelopeKey = 'needs' | 'wants' | 'savings'

export interface SubCategory {
  id:       string
  name:     string
  budget:   number | null   // null = aucun budget défini (suivi uniquement)
  envelope: EnvelopeKey | null
  excluded: boolean         // exclu des calculs budget (jauge/budget/prévisionnel/score)
}

export interface ManagedCategory {
  id:            string
  name:          string
  type:          TransactionType
  iconKey:       string
  color:         string
  isVariable:    boolean
  excluded:      boolean        // exclu des calculs budget (jauge/budget/prévisionnel/score) — ex: désépargne
  totalBudget:   number
  subcategories: SubCategory[]
}

// ============================================================
// CATEGORY STATS (aggregated server-side)
// ============================================================

export interface SubcategoryStat {
  spent: number
  count: number
}

export interface CategorySpentStat {
  totalSpent:   number
  directSpent:  number
  directCount:  number
}

export interface UncategorizedStat {
  spent: number
  count: number
}

export interface VariableDailyRemaining {
  variableBudget: number
  variableSpent:  number
  remaining:      number
  daysRemaining:  number
  dailyRemaining: number
}

// ============================================================
// SAVINGS GOALS (CAGNOTTES)
// ============================================================

export interface SavingsGoal {
  id:            string
  name:          string
  targetAmount:  number
  startAmount:   number
  currentAmount: number   // dérivé : start_amount + somme all-time des tx liées
  subcategoryId: string | null
  color:         string
  createdAt:     string
}

// ============================================================
// FAVORITES
// ============================================================

export interface Favorite {
  id:          string
  name:        string
  amount:      number
  type:        TransactionType
  category:    string
  subcategory: string
  position:    number
}

// ============================================================
// TRANSACTIONS
// ============================================================

export type TransactionStatus = 'checked' | 'pending'

export interface Transaction {
  id: string
  name: string
  note?: string | null
  category: string
  categorized: boolean
  amount: number
  date: string                      // ISO 8601 — ex: "2026-03-01T08:00:00"
  accountingDate?: string | null    // si renseigné, la tx est comptée sur ce mois
  type: TransactionType
  recurringId?: string | null
  recurrenceOccurrence?: string | null  // clé d'occurrence ex: "2026-03", "2026-W12"
  virtual?: boolean                 // true = occurrence calculée, pas en DB
  status: TransactionStatus
  horsBudget: boolean               // exclut la tx des stats et du budget mensuel
}

// Vue calculée — produite par groupByDate(), jamais stockée
export interface TxGroup {
  label: string       // "Aujourd'hui", "Hier", "22 oct."
  dateKey: string     // "2024-10-24" — clé de déduplication
  total: number
  transactions: Transaction[]
}
