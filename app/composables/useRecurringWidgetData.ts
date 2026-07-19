import { getDatesInRange } from '~/services/recurringService'
import { useRecurringStore } from '~/stores/useRecurringStore'
import { useCategoryStore }  from '~/stores/useCategoryStore'
import { usePeriodStore }    from '~/stores/usePeriodStore'
import type { TransactionType } from '~/types'

export interface OccItem {
  key:            string
  name:           string
  amount:         number
  type:           TransactionType
  date:           Date
  color:          string
  iconKey:        string
  parentCategory: string
}

export interface CatGroup {
  categoryName: string
  color:        string
  iconKey:      string
  total:        number
  items:        OccItem[]
}

export interface CalCell {
  key:     string
  day:     number | null
  isToday: boolean
  items:   OccItem[]
}

export function useRecurringWidgetData() {
  const recurringStore = useRecurringStore()
  const categoryStore  = useCategoryStore()
  const periodStore    = usePeriodStore()
  const { locale }     = useI18n()

  // ─── Résolution couleur + icône depuis la catégorie ──────────────────────────

  function getCategoryMeta(categoryRef: string): { color: string; iconKey: string; displayName: string } {
    // Cherche par nom ou ID de catégorie parente
    const direct = categoryStore.categories.find(c => c.name === categoryRef || c.id === categoryRef)
    if (direct) return { color: direct.color, iconKey: direct.iconKey, displayName: direct.name }

    // Cherche par nom ou ID de sous-catégorie
    for (const cat of categoryStore.categories) {
      if (cat.subcategories.some(s => s.name === categoryRef || s.id === categoryRef))
        return { color: cat.color, iconKey: cat.iconKey, displayName: cat.name }
    }

    return { color: '#6b6b6b', iconKey: 'package', displayName: categoryRef }
  }

  function buildItems(rangeStart: Date, rangeEnd: Date): OccItem[] {
    const items: OccItem[] = []
    for (const rec of recurringStore.recurringExpenses) {
      const meta = getCategoryMeta(rec.category)
      for (const dateStr of getDatesInRange(rec, rangeStart, rangeEnd)) {
        items.push({
          key:            `${rec.id}-${dateStr}`,
          name:           rec.name,
          amount:         rec.amount,
          type:           rec.type,
          date:           new Date(dateStr),
          color:          meta.color,
          iconKey:        meta.iconKey,
          parentCategory: meta.displayName,
        })
      }
    }
    return items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  // ─── Compact : 7 jours glissants à partir d'aujourd'hui ─────────────────────

  const sevenDayItems = computed<OccItem[]>(() => {
    const now        = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const rangeEnd   = new Date(todayStart)
    rangeEnd.setDate(todayStart.getDate() + 7)
    return buildItems(todayStart, rangeEnd)
  })

  const sevenDayGroups = computed<CatGroup[]>(() => {
    const groups = new Map<string, CatGroup>()
    for (const item of sevenDayItems.value) {
      if (!groups.has(item.parentCategory)) {
        groups.set(item.parentCategory, {
          categoryName: item.parentCategory,
          color:        item.color,
          iconKey:      item.iconKey,
          total:        0,
          items:        [],
        })
      }
      const g = groups.get(item.parentCategory)!
      g.total += Math.abs(item.amount)
      g.items.push(item)
    }
    return [...groups.values()]
  })

  // ─── Étendu : toutes les occurrences du mois sélectionné ────────────────────

  const monthLabel = computed(() => {
    const [y, m] = periodStore.month.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
  })

  const monthItems = computed<OccItem[]>(() => {
    const [y, m] = periodStore.month.split('-').map(Number)
    return buildItems(new Date(y, m - 1, 1), new Date(y, m, 1))
  })

  // ─── Cellules du calendrier ──────────────────────────────────────────────────

  const cells = computed<CalCell[]>(() => {
    const [y, m]      = periodStore.month.split('-').map(Number)
    const today       = new Date()
    const daysInMonth = new Date(y, m, 0).getDate()

    const firstDow = new Date(y, m - 1, 1).getDay()
    const offset   = firstDow === 0 ? 6 : firstDow - 1

    const result: CalCell[] = []

    for (let i = 0; i < offset; i++) {
      result.push({ key: `filler-${i}`, day: null, isToday: false, items: [] })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday =
        today.getFullYear() === y &&
        today.getMonth()    === m - 1 &&
        today.getDate()     === d

      const dayItems = monthItems.value.filter(
        it => it.date.getDate() === d && it.date.getMonth() === m - 1,
      )

      result.push({ key: `day-${d}`, day: d, isToday, items: dayItems })
    }

    return result
  })

  // ─── Formatage des dates ─────────────────────────────────────────────────────

  function fmtDayShort(date: Date): string {
    return date.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })
  }

  return { sevenDayItems, sevenDayGroups, monthLabel, monthItems, cells, fmtDayShort }
}
