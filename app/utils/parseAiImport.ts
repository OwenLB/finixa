import type { ManagedCategory, TransactionType } from '~/types'

/** Seuil en dessous duquel une transaction doit être revue par l'utilisateur. */
export const AI_CONFIDENCE_THRESHOLD = 0.8

export interface AiParsedTransaction {
  name:          string
  amount:        number          // signé : négatif = dépense
  date:          string          // "YYYY-MM-DDT12:00:00"
  type:          TransactionType
  confidence:    number          // 0..1
  category:      string          // id de (sous-)catégorie résolu, '' si non résolu
  categoryLabel: string          // libellé affichable ("Parent > Sous-cat"), '' si non résolu
  needsReview:   boolean
}

export interface AiParseResult {
  transactions: AiParsedTransaction[]
  skipped:      number
  error?:       string
}

/** Normalise un libellé de catégorie pour la comparaison (accents, casse, espaces). */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*>\s*/g, '>')
    .replace(/\s+/g, ' ')
}

interface CategoryMatch {
  id:    string
  label: string
  type:  TransactionType
}

/**
 * Construit les index de résolution des catégories :
 *  - "parent>sous-cat"  → match (toujours non ambigu)
 *  - "sous-cat" seule    → match uniquement si le nom est unique
 *  - "parent" seul       → match vers la catégorie parente
 */
function buildResolver(categories: ManagedCategory[]) {
  const full   = new Map<string, CategoryMatch>()
  const parent = new Map<string, CategoryMatch>()
  const subSeen = new Map<string, CategoryMatch | null>()  // null = ambigu

  for (const cat of categories) {
    parent.set(normalize(cat.name), { id: cat.id, label: cat.name, type: cat.type })
    for (const sub of cat.subcategories) {
      const label = `${cat.name} > ${sub.name}`
      const match: CategoryMatch = { id: sub.id, label, type: cat.type }
      full.set(normalize(label), match)
      const key = normalize(sub.name)
      subSeen.set(key, subSeen.has(key) ? null : match)
    }
  }

  return (raw: string): CategoryMatch | null => {
    const key = normalize(raw)
    if (!key) return null
    if (full.has(key)) return full.get(key)!
    if (subSeen.get(key)) return subSeen.get(key)!   // ignore null (ambigu)
    if (parent.has(key)) return parent.get(key)!
    return null
  }
}

/**
 * Extrait le bloc JSON d'une réponse IA — objet `{…}` ou tableau `[…]` —
 * en tolérant les fences markdown et le texte autour.
 */
function extractJson(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Retire d'éventuelles fences ```json ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body  = fence ? fence[1]!.trim() : trimmed

  // Début = première accolade ou crochet ; fin = dernière accolade ou crochet.
  const starts = [body.indexOf('{'), body.indexOf('[')].filter(i => i !== -1)
  const start  = starts.length ? Math.min(...starts) : -1
  const end    = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'))
  if (start === -1 || end === -1 || end < start) return null
  return body.slice(start, end + 1)
}

function parseDate(raw: string): string | null {
  const s = raw.trim()
  // "YYYY-MM-DD" (format demandé)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}T12:00:00`
  // "DD/MM/YYYY" (tolérance)
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}T12:00:00`
  return null
}

/**
 * Parse et valide la réponse JSON d'une IA, et résout chaque catégorie vers un id.
 * Les lignes invalides sont comptées dans `skipped`.
 */
export function parseAiImport(raw: string, categories: ManagedCategory[]): AiParseResult {
  const json = extractJson(raw)
  if (!json) return { transactions: [], skipped: 0, error: 'invalid' }

  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { transactions: [], skipped: 0, error: 'invalid' }
  }

  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { transactions?: unknown })?.transactions)
      ? (data as { transactions: unknown[] }).transactions
      : null

  if (!rows) return { transactions: [], skipped: 0, error: 'invalid' }

  const resolve = buildResolver(categories)
  const transactions: AiParsedTransaction[] = []
  let skipped = 0

  for (const row of rows) {
    const r = row as Record<string, unknown>
    const date = typeof r.date === 'string' ? parseDate(r.date) : null
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    const amount = typeof r.amount === 'number' ? r.amount : Number(r.amount)

    if (!date || !name || !Number.isFinite(amount) || amount === 0) {
      skipped++
      continue
    }

    let type: TransactionType = r.type === 'revenu' ? 'revenu' : 'depense'

    const confRaw = typeof r.confidence === 'number' ? r.confidence : Number(r.confidence)
    const confidence = Number.isFinite(confRaw) ? Math.min(1, Math.max(0, confRaw)) : 0

    const match = typeof r.category === 'string' ? resolve(r.category) : null
    if (match) type = match.type   // adopte le type de la catégorie résolue

    transactions.push({
      name,
      amount,
      date,
      type,
      confidence,
      category:      match?.id ?? '',
      categoryLabel: match?.label ?? '',
      needsReview:   !match || confidence < AI_CONFIDENCE_THRESHOLD,
    })
  }

  return { transactions, skipped }
}
