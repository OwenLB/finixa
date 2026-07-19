import type { Transaction, TxGroup } from '~/types'
import { todayLocalISO, yesterdayLocalISO } from '~/utils/localDate'

export interface GroupByDateLabels {
  today:     string
  yesterday: string
  locale:    string
}

function toDateKey(isoDate: string): string {
  return isoDate.slice(0, 10)
}

function toDateLabel(dateKey: string, labels: GroupByDateLabels): string {
  const today     = todayLocalISO()
  const yesterday = yesterdayLocalISO()

  if (dateKey === today)     return labels.today
  if (dateKey === yesterday) return labels.yesterday

  // T12:00:00 : parse en heure locale (un "YYYY-MM-DD" nu serait parsé en UTC
  // et s'afficherait décalé d'un jour dans les fuseaux négatifs)
  return new Date(dateKey + 'T12:00:00').toLocaleDateString(labels.locale, {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

function effectiveDateKey(tx: Transaction): string {
  return tx.accountingDate ?? toDateKey(tx.date)
}

export function groupByDate(transactions: Transaction[], labels: GroupByDateLabels): TxGroup[] {
  const sorted = [...transactions].sort(
    (a, b) => effectiveDateKey(b).localeCompare(effectiveDateKey(a))
  )

  const map = new Map<string, TxGroup>()

  for (const tx of sorted) {
    const key = effectiveDateKey(tx)

    if (!map.has(key)) {
      map.set(key, {
        label:        toDateLabel(key, labels),
        dateKey:      key,
        total:        0,
        transactions: [],
      })
    }

    const group = map.get(key)!
    group.transactions.push(tx)
    group.total += tx.amount
  }

  return [...map.values()]
}
