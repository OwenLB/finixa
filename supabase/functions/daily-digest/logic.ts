// Logique pure du digest quotidien, isolée de `index.ts` pour être testable sans
// effets de bord (pas de `createClient`, pas de `web-push`, pas de `Deno.env`).
// `index.ts` importe ces fonctions ; les tests (`logic.test.ts`) les couvrent.

export interface NotifPrefs {
  enabled:       boolean
  hour:          number
  timezone:      string
  inactivity:    { enabled: boolean; days: number }
  uncategorized: { enabled: boolean; threshold: number }
  pending:       { enabled: boolean; threshold: number }
}

export const DEFAULT_PREFS: NotifPrefs = {
  enabled:       true,
  hour:          18,
  timezone:      'UTC',
  inactivity:    { enabled: true, days: 3 },
  uncategorized: { enabled: true, threshold: 1 },
  pending:       { enabled: true, threshold: 5 },
}

/** Heure locale courante — un timezone invalide (saisi par l'utilisateur) retombe sur UTC. */
export function localHourFor(tz: string, now: Date = new Date()): number {
  let h: number
  try {
    h = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(now), 10)
  } catch {
    h = now.getUTCHours()
  }
  return h === 24 ? 0 : h
}

/** Fusionne des préférences partielles (issues de la BDD) avec les valeurs par défaut. */
export function mergePrefs(raw: Partial<NotifPrefs> | null): NotifPrefs {
  if (!raw) return DEFAULT_PREFS
  return {
    ...DEFAULT_PREFS,
    ...raw,
    inactivity:    { ...DEFAULT_PREFS.inactivity,    ...raw.inactivity },
    uncategorized: { ...DEFAULT_PREFS.uncategorized, ...raw.uncategorized },
    pending:       { ...DEFAULT_PREFS.pending,       ...raw.pending },
  }
}

/** Corps du rappel d'inactivité (pluralisation + cas « aucune transaction »). */
export function inactivityBody(daysSinceLast: number | null): string {
  return daysSinceLast !== null
    ? `Rien de saisi depuis ${daysSinceLast} jour${daysSinceLast > 1 ? 's' : ''}`
    : 'Aucune transaction saisie'
}

/**
 * Construit les fragments du digest « ménage » selon les seuils et activations.
 * Reçoit les compteurs déjà calculés (les requêtes restent dans `index.ts`).
 */
export function digestParts(
  { uncategorized, pending, prefs }:
  { uncategorized: number; pending: number; prefs: NotifPrefs },
): string[] {
  const parts: string[] = []
  if (prefs.uncategorized.enabled && uncategorized >= prefs.uncategorized.threshold) {
    parts.push(`${uncategorized} non catégorisée${uncategorized > 1 ? 's' : ''}`)
  }
  if (prefs.pending.enabled && pending >= prefs.pending.threshold) {
    parts.push(`${pending} non pointée${pending > 1 ? 's' : ''}`)
  }
  return parts
}
