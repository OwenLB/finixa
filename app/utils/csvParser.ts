import Papa from 'papaparse'

export interface ParsedTransaction {
  name:   string
  amount: number
  date:   string   // "YYYY-MM-DDT12:00:00"
  type:   'depense' | 'revenu'
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  skipped:      number
}

/** Supprime le préfixe "CARTE DD/MM " généré par certaines banques */
function cleanLabel(raw: string): string {
  return raw.replace(/^CARTE \d{2}\/\d{2} /i, '').trim()
}

/** "DD/MM/YYYY" → "YYYY-MM-DDT12:00:00" */
function parseDate(raw: string): string {
  const [d, m, y] = raw.split('/')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00`
}

/** "32,56" ou "32.56" → 32.56 */
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(',', '.').replace(/\s/g, '')) || 0
}

/**
 * Parse un CSV bancaire au format :
 * "Date operation";"Date valeur";"Libelle";"Debit";"Credit"
 *
 * Utilise papaparse pour une gestion robuste des guillemets et caractères spéciaux.
 */
export function parseBankCsv(content: string): ParseResult {
  const { data, errors } = Papa.parse<string[]>(content, {
    delimiter:      ';',
    skipEmptyLines: true,
  })

  const transactions: ParsedTransaction[] = []
  let skipped = errors.length

  // Ignore la ligne d'en-tête (index 0)
  for (let i = 1; i < data.length; i++) {
    const fields    = data[i]!
    const dateRaw   = fields[0]?.trim()
    const labelRaw  = fields[2]?.trim()
    const debitRaw  = fields[3]?.trim()
    const creditRaw = fields[4]?.trim()

    if (!dateRaw || !labelRaw) { skipped++; continue }

    try {
      const name = cleanLabel(labelRaw)
      const date = parseDate(dateRaw)

      if (debitRaw) {
        const amount = parseAmount(debitRaw)
        if (amount > 0) {
          transactions.push({ name, amount: -amount, date, type: 'depense' })
          continue
        }
      }

      if (creditRaw) {
        const amount = parseAmount(creditRaw)
        if (amount > 0) {
          transactions.push({ name, amount, date, type: 'revenu' })
          continue
        }
      }

      skipped++
    } catch {
      skipped++
    }
  }

  return { transactions, skipped }
}
