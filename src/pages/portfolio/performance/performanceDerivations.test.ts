import { describe, expect, it } from 'vitest'
import { derivationFields, derivationRows } from '@/utils/derivation'
import { dayCellDerivation, equityGrowthDerivation, optionsModeDerivation } from './performanceDerivations'

// Invented figures.
describe('performance derivations', () => {
  it('builds Economic and Total from the same Book R', () => {
    const d = optionsModeDerivation({ bookR: 100, open: 40, total: 140, economic: 90, sumRollAdj: -10, econMinusTotal: -50, econMinusBook: -10 }, '2026-01-02')
    expect(derivationRows(d).map((r) => r.name)).toEqual(['Total', 'Economic', 'Econ − Total'])
    expect(derivationFields(d)).toEqual(['Book R', 'Open', 'Σ roll adj'])
    expect(d.variables.Open.meaning).toContain('02JAN26')
  })

  it('adds only the switched-on layers into the Total line', () => {
    const d = equityGrowthDerivation({
      last: { options: 10, stocks: 5, fixed_income: 3, cash_like: 1 },
      netPnl: 19,
      bookR: 10,
      visible: { options: true, stocks: false, fixed_income: true, cash_like: false },
      mode: 'book',
    })
    expect(d.variables['Total line'].formula).toBe('{Options} + {FI Stream}')
    expect(d.variables['Total line'].value).toBe('$13.00')
  })

  it('reads a stock layer cell as R and N, not R and U', () => {
    expect(dayCellDerivation('stocks', null).roots).toEqual(['R', 'N'])
    expect(dayCellDerivation('fixed_income', null).roots).toEqual(['R', 'S'])
    expect(dayCellDerivation('options', null).roots).toEqual(['R', 'U'])
  })
})
