import { assertEquals } from 'jsr:@std/assert@1'
import { DEFAULT_PREFS, localHourFor, mergePrefs, inactivityBody, digestParts } from './logic.ts'

// ── mergePrefs ────────────────────────────────────────────────────────────────
Deno.test('mergePrefs(null) retourne les valeurs par défaut', () => {
  assertEquals(mergePrefs(null), DEFAULT_PREFS)
})

Deno.test('mergePrefs fusionne un champ de premier niveau sans toucher au reste', () => {
  const out = mergePrefs({ hour: 9 })
  assertEquals(out.hour, 9)
  assertEquals(out.enabled, true)
  assertEquals(out.timezone, 'UTC')
  assertEquals(out.inactivity, DEFAULT_PREFS.inactivity)
})

Deno.test('mergePrefs fusionne en profondeur (sous-objet partiel)', () => {
  const out = mergePrefs({ uncategorized: { threshold: 5 } } as never)
  assertEquals(out.uncategorized.threshold, 5)
  assertEquals(out.uncategorized.enabled, true) // conservé du défaut
  assertEquals(out.pending, DEFAULT_PREFS.pending)
})

// ── localHourFor ──────────────────────────────────────────────────────────────
Deno.test('localHourFor — timezone invalide retombe sur UTC', () => {
  const now = new Date('2026-06-16T09:30:00Z')
  assertEquals(localHourFor('Pas/UneZone', now), 9)
})

Deno.test('localHourFor — décalage horaire appliqué', () => {
  const now = new Date('2026-06-16T09:30:00Z')
  // Tokyo = UTC+9 → 18 h
  assertEquals(localHourFor('Asia/Tokyo', now), 18)
})

Deno.test('localHourFor — toujours dans [0, 23]', () => {
  const now = new Date('2026-06-16T00:10:00Z') // minuit UTC (cas 24→0)
  const h = localHourFor('UTC', now)
  assertEquals(h >= 0 && h <= 23, true)
  assertEquals(h, 0)
})

// ── inactivityBody ────────────────────────────────────────────────────────────
Deno.test('inactivityBody — aucune transaction', () => {
  assertEquals(inactivityBody(null), 'Aucune transaction saisie')
})

Deno.test('inactivityBody — singulier / pluriel', () => {
  assertEquals(inactivityBody(1), 'Rien de saisi depuis 1 jour')
  assertEquals(inactivityBody(3), 'Rien de saisi depuis 3 jours')
})

// ── digestParts ───────────────────────────────────────────────────────────────
Deno.test('digestParts — sous les seuils → vide', () => {
  const prefs = DEFAULT_PREFS
  assertEquals(digestParts({ uncategorized: 0, pending: 4, prefs }), [])
})

Deno.test('digestParts — non catégorisées (singulier/pluriel)', () => {
  const prefs = DEFAULT_PREFS // seuil 1
  assertEquals(digestParts({ uncategorized: 1, pending: 0, prefs }), ['1 non catégorisée'])
  assertEquals(digestParts({ uncategorized: 3, pending: 0, prefs }), ['3 non catégorisées'])
})

Deno.test('digestParts — non pointées au seuil', () => {
  const prefs = DEFAULT_PREFS // seuil 5
  assertEquals(digestParts({ uncategorized: 0, pending: 5, prefs }), ['5 non pointées'])
})

Deno.test('digestParts — critère désactivé ignoré malgré un compteur élevé', () => {
  const prefs = { ...DEFAULT_PREFS, uncategorized: { enabled: false, threshold: 1 } }
  assertEquals(digestParts({ uncategorized: 42, pending: 0, prefs }), [])
})

Deno.test('digestParts — les deux fragments, dans l’ordre', () => {
  const prefs = DEFAULT_PREFS
  assertEquals(
    digestParts({ uncategorized: 2, pending: 6, prefs }),
    ['2 non catégorisées', '6 non pointées'],
  )
})
