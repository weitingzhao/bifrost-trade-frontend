import { describe, it, expect } from 'vitest'
import { sortObligations, type ObligationsRow } from './obligationsRoom'

const row = (o: Partial<ObligationsRow> & { symbol: string }): ObligationsRow => ({
  accountId: 'U1',
  shortPuts: 0,
  cashIfAssigned: 0,
  coveredCalls: 0,
  nakedCalls: 0,
  sharesHeld: 0,
  sharesBacking: 0,
  sharesSpare: 0,
  moreCalls: 0,
  avgCost: null,
  price: null,
  marketValue: null,
  dailyPnl: null,
  totalPnl: null,
  ...o,
})

const symbols = (rows: readonly ObligationsRow[]) => rows.map((r) => r.symbol)

describe('sortObligations', () => {
  const rows = [
    row({ symbol: 'MU', cashIfAssigned: 20_000, coveredCalls: 9, nakedCalls: 1, moreCalls: 2 }),
    row({ symbol: 'AAPL', cashIfAssigned: 50_000, coveredCalls: 4, nakedCalls: 0, moreCalls: 5 }),
    row({ symbol: 'RKLB', cashIfAssigned: 0, coveredCalls: 10, nakedCalls: 0, moreCalls: 0 }),
    row({ symbol: 'CBRS', cashIfAssigned: 20_000, coveredCalls: 0, nakedCalls: 0, moreCalls: 2 }),
  ]

  it('cash: largest put demand first, ties keep arrival order', () => {
    expect(symbols(sortObligations(rows, 'cash'))).toEqual(['AAPL', 'MU', 'CBRS', 'RKLB'])
  })

  it('calls: most short calls first, naked breaks the tie', () => {
    // MU and RKLB both carry ten; MU has one naked and ranks first.
    expect(symbols(sortObligations(rows, 'calls'))).toEqual(['MU', 'RKLB', 'AAPL', 'CBRS'])
  })

  it('spare: most room first, ties keep arrival order', () => {
    expect(symbols(sortObligations(rows, 'spare'))).toEqual(['AAPL', 'MU', 'CBRS', 'RKLB'])
  })

  it('symbol: A to Z', () => {
    expect(symbols(sortObligations(rows, 'symbol'))).toEqual(['AAPL', 'CBRS', 'MU', 'RKLB'])
  })

  it('does not mutate the input', () => {
    const before = symbols(rows)
    sortObligations(rows, 'cash')
    expect(symbols(rows)).toEqual(before)
  })

  it('handles an empty book', () => {
    expect(sortObligations([], 'cash')).toEqual([])
  })
})
