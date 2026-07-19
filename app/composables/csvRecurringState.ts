import { ref } from 'vue'

// État partagé minimal — aucune dépendance circulaire possible.
// Permet à CategorizationQueue / RecurringSection de piloter le flow CSV
// sans importer useCsvImport (qui charge des stores).

export const _csvAutoRecurring = ref(false)
export const _csvOpenDrawer    = ref(false)

/** Depuis CategorizationQueue : ouvre le drawer CSV en phase recurring après catégorisation */
export function scheduleCsvRecurring() {
  _csvAutoRecurring.value = true
}

/** Depuis RecurringSection : ouvre le drawer CSV directement en phase détection */
export function openCsvDrawerForDetection() {
  _csvAutoRecurring.value = true
  _csvOpenDrawer.value    = true
}
