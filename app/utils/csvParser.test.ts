import { describe, it, expect } from 'vitest'
import { parseBankCsv } from './csvParser'

const HEADER = 'Date operation;Date valeur;Libelle;Debit;Credit'

describe('parseBankCsv', () => {
  it('parse une dépense (débit) en montant négatif et nettoie le préfixe CARTE', () => {
    const csv = [HEADER, '15/06/2026;15/06/2026;CARTE 14/06 SUPER U;32,56;'].join('\n')
    const { transactions, skipped } = parseBankCsv(csv)
    expect(transactions).toEqual([
      { name: 'SUPER U', amount: -32.56, date: '2026-06-15T12:00:00', type: 'depense' },
    ])
    expect(skipped).toBe(0)
  })

  it('parse un revenu (crédit) en montant positif', () => {
    const csv = [HEADER, '01/06/2026;01/06/2026;VIREMENT SALAIRE;;2000.00'].join('\n')
    const { transactions } = parseBankCsv(csv)
    expect(transactions[0]).toEqual({
      name: 'VIREMENT SALAIRE', amount: 2000, date: '2026-06-01T12:00:00', type: 'revenu',
    })
  })

  it('ignore les lignes sans date ni libellé', () => {
    const csv = [HEADER, ';;;;', '10/06/2026;10/06/2026;Resto;15,00;'].join('\n')
    const { transactions, skipped } = parseBankCsv(csv)
    expect(transactions.length).toBe(1)
    expect(skipped).toBeGreaterThanOrEqual(1)
  })

  it('gère les montants avec séparateur de milliers (espace)', () => {
    const csv = [HEADER, '10/06/2026;10/06/2026;Loyer;1 200,00;'].join('\n')
    const { transactions } = parseBankCsv(csv)
    expect(transactions[0]!.amount).toBe(-1200)
  })
})
