import { describe, expect, it } from 'vitest'
import type { StressScenario, UnderlyingEntry } from '@/types/modelAnalysis'
import {
  NAMED_SCENARIOS,
  STRESS_VOL_ROWS,
  stressColumns,
  whoPays,
  worstColumn,
} from './stressModel'

function sc(over: Partial<StressScenario> & Pick<StressScenario, 'spot_shock'>): StressScenario {
  return { iv_shock: 0, total_pnl: 0, pnl_change: -100, contributors: 3, ...over } as StressScenario
}

function und(symbol: string, scenarios: StressScenario[]): UnderlyingEntry {
  return { symbol, stress: { available: true, scenarios } } as UnderlyingEntry
}

describe('stressColumns', () => {
  it('sums the spot axis across accounts and keeps the columns in order', () => {
    const cols = stressColumns([
      [sc({ spot_shock: -0.1, pnl_change: -1000 }), sc({ spot_shock: 0, pnl_change: 0 })],
      [sc({ spot_shock: -0.1, pnl_change: -400, partial: true }), sc({ spot_shock: 0.1, pnl_change: 900 })],
    ])
    expect(cols.map((c) => c.shock)).toEqual([-0.1, 0, 0.1])
    expect(cols[0]).toMatchObject({ pnlChange: -1400, contributors: 6, partial: true })
    expect(cols[2].pnlChange).toBe(900)
  })

  it('ignores a vol-shocked scenario — this page’s axis is spot at today’s vol', () => {
    const cols = stressColumns([[sc({ spot_shock: -0.1, iv_shock: 0.2, pnl_change: -9_999 })]])
    expect(cols).toEqual([])
  })

  it('keeps the design’s vol rows so the shape reads, with only flat carrying a shock', () => {
    expect(STRESS_VOL_ROWS.map((r) => r.ivShock)).toEqual([null, null, 0, null])
  })
})

describe('whoPays', () => {
  const entries = [
    und('ZZZ', [sc({ spot_shock: -0.1, pnl_change: -600, options_pnl: -100, stock_pnl: -500, new_spot: 90 })]),
    und('YYY', [sc({ spot_shock: -0.1, pnl_change: -200 })]),
    // A name that gains on the shock: it is shown, but it is not paying.
    und('WWW', [sc({ spot_shock: -0.1, pnl_change: 150 })]),
    // Priced at a different column only — absent from this one, never zero.
    und('VVV', [sc({ spot_shock: -0.05, pnl_change: -50 })]),
    { symbol: 'UUU', stress: { available: false } } as UnderlyingEntry,
  ]

  it('names who pays for a column, worst first, with each one’s share of the loss', () => {
    const rows = whoPays(entries, -0.1)
    expect(rows.map((r) => r.symbol)).toEqual(['ZZZ', 'YYY', 'WWW'])
    expect(rows[0]).toMatchObject({ pnlChange: -600, optionsPnl: -100, stockPnl: -500, newSpot: 90 })
    expect(rows[0].share).toBeCloseTo(0.75)
    expect(rows[1].share).toBeCloseTo(0.25)
    // A name that gained has no share of the loss — a negative share would be a fiction.
    expect(rows[2].share).toBeNull()
  })

  it('is one row per name, even when the same symbol is held in two accounts', () => {
    const rows = whoPays(
      [
        und('ZZZ', [sc({ spot_shock: -0.1, pnl_change: -600, options_pnl: -100, stock_pnl: -500, new_spot: 90 })]),
        und('ZZZ', [sc({ spot_shock: -0.1, pnl_change: -150, options_pnl: 0, stock_pnl: -150, new_spot: 90 })]),
      ],
      -0.1,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ symbol: 'ZZZ', pnlChange: -750, stockPnl: -650, optionsPnl: -100, newSpot: 90 })
  })

  it('leaves out a name the service could not stress at this column rather than reading it as zero', () => {
    expect(whoPays(entries, -0.1).some((r) => r.symbol === 'VVV' || r.symbol === 'UUU')).toBe(false)
    expect(whoPays(entries, -0.05).map((r) => r.symbol)).toEqual(['VVV'])
  })
})

describe('worstColumn', () => {
  it('is the column the reader should start from, and is null when the grid is empty', () => {
    const cols = stressColumns([[sc({ spot_shock: -0.1, pnl_change: -1000 }), sc({ spot_shock: 0.1, pnl_change: 500 })]])
    expect(worstColumn(cols)?.shock).toBe(-0.1)
    expect(worstColumn([])).toBeNull()
  })
})

describe('the named scenarios', () => {
  it('every one of them moves vol, so none can be read off a spot-only grid', () => {
    expect(NAMED_SCENARIOS).toHaveLength(4)
    for (const s of NAMED_SCENARIOS) {
      expect(s.shock).toMatch(/vol/)
      expect(s.blocked).toMatch(/vol axis/)
    }
  })
})
