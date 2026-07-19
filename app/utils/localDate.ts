/**
 * Dates « calendrier local » au format YYYY-MM-DD.
 *
 * Ne jamais utiliser `new Date().toISOString().slice(0, 10)` pour une date
 * de saisie : toISOString() convertit en UTC et décale d'un jour autour de
 * minuit (ex. 1er juillet 00h30 à Paris → "2026-06-30").
 */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Date du jour, fuseau local. */
export function todayLocalISO(): string {
  return toLocalISO(new Date())
}

/** Date d'hier, fuseau local. */
export function yesterdayLocalISO(): string {
  const now = new Date()
  return toLocalISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
}

/** Ajoute (ou retire) des jours à une date YYYY-MM-DD, en calendrier local. */
export function addDaysISO(dateISO: string, delta: number): string {
  const d = new Date(dateISO + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return toLocalISO(d)
}
