import type { ParsedTransaction } from '~/utils/csvParser'
import type { RecurringFrequency } from '~/types'
import { toLocalISO } from '~/utils/localDate'

// ─── Public types ───────────────────────────────────────────────────────────

export type RecurringConfidence = 'high' | 'medium'

export interface RecurringSuggestion {
  /** Best display name for the group (most frequent original label) */
  displayName:    string
  /** All original labels found in this group */
  originalNames:  string[]
  /** Signed amount: negative for expense, positive for revenue */
  amount:         number
  type:           'depense' | 'revenu'
  frequency:      RecurringFrequency
  /** Average interval between occurrences in days */
  intervalDays:   number
  /** 0–1 overall confidence score */
  score:          number
  confidence:     RecurringConfidence
  occurrences:    number
  /** ISO date string of the most recent occurrence */
  lastDate:       string
  /** Most common day-of-month (null for weekly) */
  dayOfMonth:     number | null
  /** Subcategory UUID resolved from historical data (null = no match found) */
  categoryId:     string | null
  categorized:    boolean
}

// ─── Internal ────────────────────────────────────────────────────────────────

/** Strip accents, lowercase, remove non-alphanumeric chars, collapse spaces */
function normalizeLabel(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Build set of character trigrams for a string */
function trigrams(s: string): Set<string> {
  const padded = ` ${s} `
  const result = new Set<string>()
  for (let i = 0; i < padded.length - 2; i++) {
    result.add(padded.slice(i, i + 3))
  }
  return result
}

/** Dice coefficient on character trigrams — 0 (no overlap) to 1 (identical) */
function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const ta = trigrams(a)
  const tb = trigrams(b)
  if (ta.size === 0 && tb.size === 0) return 1
  if (ta.size === 0 || tb.size === 0) return 0
  let intersection = 0
  for (const t of ta) { if (tb.has(t)) intersection++ }
  return (2 * intersection) / (ta.size + tb.size)
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stdDev(arr: number[], avg = mean(arr)): number {
  const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length
  return Math.sqrt(variance)
}

/** Coefficient of variation (stdDev / mean), clamped to [0, ∞) */
function cv(arr: number[]): number {
  const m = mean(arr)
  if (m === 0) return 0
  return stdDev(arr, m) / Math.abs(m)
}

/**
 * Convert average interval (days) to the closest RecurringFrequency.
 * Returns null if the interval doesn't fit any known pattern.
 */
function detectFrequency(avgDays: number): RecurringFrequency | null {
  if (avgDays >= 5  && avgDays <= 10)  return 'weekly'
  if (avgDays >= 25 && avgDays <= 37)  return 'monthly'
  if (avgDays >= 80 && avgDays <= 100) return 'quarterly'
  if (avgDays >= 340 && avgDays <= 390) return 'yearly'
  return null
}

/** How many periods (month/week) contain multiple transactions from this group */
function periodUniquenessScore(dates: Date[], frequency: RecurringFrequency): number {
  const getPeriodKey = (d: Date): string => {
    if (frequency === 'weekly') {
      // ISO week: year + week number
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
      const year = tmp.getUTCFullYear()
      const week = Math.ceil(((tmp.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000 + 1) / 7)
      return `${year}-W${String(week).padStart(2, '0')}`
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const counts = new Map<string, number>()
  for (const d of dates) {
    const k = getPeriodKey(d)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }

  const values = [...counts.values()]
  const singleOccurrencePeriods = values.filter(c => c === 1).length
  const ratio = singleOccurrencePeriods / values.length

  // If most periods have only one transaction → good signal (subscription-like)
  // If many periods have multiple → likely not a recurring subscription
  if (ratio >= 0.85) return 1.0
  if (ratio >= 0.70) return 0.7
  if (ratio >= 0.50) return 0.4
  return 0.15
}

/** Modal value from an array of numbers (most frequent) */
function modalValue(arr: number[]): number {
  const freq = new Map<number, number>()
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]![0]
}

/** Most frequent string in array */
function mostFrequent<T>(arr: T[]): T {
  const freq = new Map<T, number>()
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]![0]
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

const SIMILARITY_THRESHOLD = 0.55

interface TxGroup {
  centroidNorm: string
  transactions: ParsedTransaction[]
  normFreq:     Map<string, number>
  normLabels:   string[]
}

/**
 * Greedy single-linkage grouping: a transaction joins the first group whose
 * centroid label is similar enough; otherwise a new group is created.
 *
 * Optimisations vs version naïve :
 * - Les labels normalisés sont précalculés une seule fois en O(n) au lieu
 *   de O(n²) (normalizeLabel appelé à chaque comparaison).
 * - Le centroïde est maintenu de manière incrémentale via une Map de
 *   fréquences (O(1) par insertion) plutôt que par mostFrequent(all) en O(n).
 */
function groupBySimilarLabel(transactions: ParsedTransaction[]): TxGroup[] {
  const groups: TxGroup[] = []
  const preNorm = transactions.map(tx => normalizeLabel(tx.name))

  for (let i = 0; i < transactions.length; i++) {
    const tx   = transactions[i]!
    const norm = preNorm[i]!
    let bestGroup: TxGroup | null = null
    let bestSim = SIMILARITY_THRESHOLD - 0.001

    for (const g of groups) {
      const sim = trigramSimilarity(norm, g.centroidNorm)
      if (sim > bestSim) { bestSim = sim; bestGroup = g }
    }

    if (bestGroup) {
      bestGroup.transactions.push(tx)
      bestGroup.normLabels.push(norm)
      const freq = (bestGroup.normFreq.get(norm) ?? 0) + 1
      bestGroup.normFreq.set(norm, freq)
      if (freq > (bestGroup.normFreq.get(bestGroup.centroidNorm) ?? 0)) {
        bestGroup.centroidNorm = norm
      }
    } else {
      groups.push({
        centroidNorm: norm,
        transactions: [tx],
        normFreq:     new Map([[norm, 1]]),
        normLabels:   [norm],
      })
    }
  }

  return groups
}

// ─── Main export ─────────────────────────────────────────────────────────────

const MIN_OCCURRENCES  = 3
const HIGH_SCORE_FLOOR = 0.68
const MED_SCORE_FLOOR  = 0.48

/**
 * Analyse a flat list of parsed CSV transactions and return probable recurring
 * patterns, sorted by descending score.
 *
 * Only expenses and revenues are considered; mixed-type groups are ignored.
 */
export function detectRecurringPatterns(transactions: ParsedTransaction[]): RecurringSuggestion[] {
  // Only analyse expenses and revenues (not epargne)
  const eligible = transactions.filter(tx => tx.type === 'depense' || tx.type === 'revenu')
  if (eligible.length < MIN_OCCURRENCES) return []

  const groups = groupBySimilarLabel(eligible)
  const suggestions: RecurringSuggestion[] = []

  for (const group of groups) {
    const txs = group.transactions
    if (txs.length < MIN_OCCURRENCES) continue

    // ── All transactions in the group must share the same type ────────────
    const type = txs[0]!.type
    if (txs.some(t => t.type !== type)) continue

    // ── Sort by date ──────────────────────────────────────────────────────
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))
    const dates  = sorted.map(t => new Date(t.date))

    // ── Interval analysis ─────────────────────────────────────────────────
    const intervals: number[] = []
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i]!.getTime() - dates[i - 1]!.getTime()) / 86_400_000)
    }
    const avgInterval = mean(intervals)
    const intervalCV  = cv(intervals)

    const frequency = detectFrequency(avgInterval)
    if (!frequency) continue  // interval doesn't match any known pattern

    // Interval regularity score: penalise high CV (high variation = not regular)
    // CV < 0.10 → excellent; CV > 0.5 → poor
    const intervalScore = Math.max(0, 1 - intervalCV * 2.2)

    // ── Amount stability ──────────────────────────────────────────────────
    const amounts     = sorted.map(t => Math.abs(t.amount))
    const amountCV    = cv(amounts)
    const amountScore = Math.max(0, 1 - amountCV * 3)

    // ── Label cohesion within group ───────────────────────────────────────
    // normLabels est précalculé dans groupBySimilarLabel — pas de re-normalisation
    const labelScore = mean(group.normLabels.map(n => trigramSimilarity(n, group.centroidNorm)))

    // ── Period uniqueness (anti-grocery false-positive) ───────────────────
    const periodScore = periodUniquenessScore(dates, frequency)

    // ── Final weighted score ──────────────────────────────────────────────
    // Weights: label 35%, interval 40%, amount 15%, period 10%
    const rawScore = 0.35 * labelScore + 0.40 * intervalScore + 0.15 * amountScore + 0.10 * periodScore
    const score    = Math.min(1, Math.max(0, rawScore))

    if (score < MED_SCORE_FLOOR) continue

    const confidence: RecurringConfidence = score >= HIGH_SCORE_FLOOR ? 'high' : 'medium'

    // ── Representative amount (median absolute value, signed) ─────────────
    const sortedAmounts = [...amounts].sort((a, b) => a - b)
    const medianAbs     = sortedAmounts[Math.floor(sortedAmounts.length / 2)]!
    const signedAmount  = type === 'depense' ? -medianAbs : medianAbs

    // ── Day-of-month (modal day for monthly/quarterly/yearly) ─────────────
    const dayOfMonth: number | null = frequency === 'weekly'
      ? null
      : modalValue(dates.map(d => d.getDate()))

    suggestions.push({
      displayName:   mostFrequent(sorted.map(t => t.name)),
      originalNames: [...new Set(sorted.map(t => t.name))],
      amount:        signedAmount,
      type,
      frequency,
      intervalDays:  Math.round(avgInterval),
      score,
      confidence,
      occurrences:   txs.length,
      lastDate:      sorted[sorted.length - 1]!.date.slice(0, 10),
      dayOfMonth,
      categoryId:    null,
      categorized:   false,
    })
  }

  return suggestions.sort((a, b) => b.score - a.score)
}

/**
 * Écarte les suggestions déjà configurées comme récurrences existantes.
 * Une suggestion est un doublon si une récurrence existante a le même `type`
 * et un nom identique (normalisé : minuscule, sans accents) au displayName ou
 * à l'un des libellés d'origine.
 */
export function filterNewSuggestions(
  detected: RecurringSuggestion[],
  existing: { name: string; type: string }[],
): RecurringSuggestion[] {
  if (!existing.length) return detected
  const norm = (s: string) => s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return detected.filter((sug) => {
    const candidates = new Set([sug.displayName, ...sug.originalNames].map(norm))
    return !existing.some(r => r.type === sug.type && candidates.has(norm(r.name)))
  })
}

/**
 * Compute the ISO date string of the next expected occurrence after `lastDate`
 * for a given frequency and optional dayOfMonth.
 */
export function nextOccurrenceDate(
  lastDate: string,
  frequency: RecurringFrequency,
  dayOfMonth: number | null,
): string {
  const base = new Date(lastDate + 'T12:00:00')

  /** Build a date for (year, 0-indexed month) clamping dayOfMonth to the month's last day */
  function buildDate(y: number, m: number): string {
    const maxDay = new Date(y, m + 1, 0).getDate()
    const day    = dayOfMonth ? Math.min(dayOfMonth, maxDay) : base.getDate()
    return toLocalISO(new Date(y, m, day))
  }

  const y = base.getFullYear()
  const m = base.getMonth()

  switch (frequency) {
    case 'weekly': {
      const next = new Date(base)
      next.setDate(next.getDate() + 7)
      return toLocalISO(next)
    }
    case 'monthly':   return buildDate(y + (m + 1 > 11 ? 1 : 0), (m + 1) % 12)
    case 'quarterly': return buildDate(y + (m + 3 > 11 ? 1 : 0), (m + 3) % 12)
    case 'yearly':    return buildDate(y + 1, m)
  }
}
