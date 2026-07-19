import type { TransactionType } from '~/types'

export interface EnrichedSub {
  id:        string
  name:      string
  budget:    number | null
  spent:     number
  count:     number
  excluded?: boolean
}

export interface EnrichedCategory {
  id:            string
  name:          string
  type:          TransactionType
  iconKey:       string
  color:         string
  isVariable:    boolean
  excluded:      boolean
  budget:        number
  spent:         number
  excludedSpent: number       // part dépensée par les sous-catégories exclues (segment rouge)
  subcategories: EnrichedSub[]
}

export interface TypeBreakdown {
  segments: { name: string; color: string; value: number }[]
  total:    number
}
