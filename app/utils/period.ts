export function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  return toKey(new Date(y, m - 1 + delta))
}

export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Budgets/catégories modifiables uniquement sur le mois en cours */
export function isPeriodEditable(month: string): boolean {
  return month === currentMonthKey()
}

/**
 * Calcule les bornes réelles d'une période comptable personnalisée.
 * Pour startDay=25 et monthKey="2026-04" : start="2026-04-25", end="2026-05-25" (exclusif)
 * Le mois court est géré par clamp sur le dernier jour du mois.
 */
export function getPeriodBounds(
  startDay: number,
  monthKey: string,
): { start: string; end: string } {
  if (startDay <= 1) {
    const [y, m] = monthKey.split('-').map(Number)
    const endY = m === 12 ? y + 1 : y
    const endM = m === 12 ? 1 : m + 1
    return {
      start: `${monthKey}-01`,
      end: `${endY}-${String(endM).padStart(2, '0')}-01`,
    }
  }
  const [y, m] = monthKey.split('-').map(Number)
  const daysInStart = new Date(y, m, 0).getDate()
  const clampedStart = Math.min(startDay, daysInStart)
  const endY = m === 12 ? y + 1 : y
  const endM = m === 12 ? 1 : m + 1
  const daysInEnd = new Date(endY, endM, 0).getDate()
  const clampedEnd = Math.min(startDay, daysInEnd)
  return {
    start: `${monthKey}-${String(clampedStart).padStart(2, '0')}`,
    end: `${endY}-${String(endM).padStart(2, '0')}-${String(clampedEnd).padStart(2, '0')}`,
  }
}

/**
 * Retourne la clé de période ("YYYY-MM") qui contient aujourd'hui.
 * Avec startDay=25 : si on est le 23 avril, on est encore dans la période "mars" (25 mars – 24 avr.).
 */
export function currentPeriodKey(startDay: number): string {
  const today = new Date()
  if (startDay > 1 && today.getDate() < startDay) {
    return toKey(new Date(today.getFullYear(), today.getMonth() - 1))
  }
  return toKey(today)
}
