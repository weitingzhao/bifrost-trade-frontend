import { describe, expect, it } from 'vitest'
import { cutDisagreement, neverTraded, structureRows } from './structureCut'
import type { WinRateStructureRow } from '@/types/strategy'

function row(p: Partial<WinRateStructureRow> & { structure_name: string }): WinRateStructureRow {
  return {
    total_instances: 0,
    profit_trades: 0,
    loss_trades: 0,
    total_profit: null,
    total_loss: null,
    profit_investment: null,
    loss_investment: null,
    total_investment: null,
    total_max_risk: null,
    structure_return_pct: null,
    profit_avg_pct: null,
    loss_avg_pct: null,
    single_max_loss_pct: null,
    profit_avg_usd: null,
    loss_avg_usd: null,
    ...p,
  }
}

const CSP = row({ structure_name: 'Cash Secured Put', total_instances: 19, profit_trades: 18, loss_trades: 1 })
const CC = row({ structure_name: 'Covered Call', total_instances: 57, profit_trades: 50, loss_trades: 7 })
const IC = row({ structure_name: 'Iron Condor' })
const TOTALS = row({
  structure_name: 'All structures',
  total_instances: 85,
  profit_trades: 75,
  loss_trades: 10,
})

describe('structureRows', () => {
  it('leads with the service’s own totals row', () => {
    const rows = structureRows([CSP, CC], TOTALS)
    expect(rows[0].totals).toBe(true)
    expect(rows[0].name).toBe('All structures')
    expect(rows.slice(1).every((r) => !r.totals)).toBe(true)
  })

  it('has no totals row when the service returns none, rather than summing its own', () => {
    // A total summed here would drift from the service's the moment either
    // changed its definition of investment.
    const rows = structureRows([CSP, CC], null)
    expect(rows.every((r) => !r.totals)).toBe(true)
    expect(rows).toHaveLength(2)
  })

  it('orders the body by sample, largest first', () => {
    expect(structureRows([CSP, CC, IC], null).map((r) => r.name)).toEqual([
      'Covered Call',
      'Cash Secured Put',
      'Iron Condor',
    ])
  })

  it('takes the win rate over what resolved, not over n', () => {
    // 18 of 19 instances resolved as wins and one as a loss; an open instance
    // has neither won nor lost, and counting it would depress every rate.
    const open = row({ structure_name: 'Half open', total_instances: 20, profit_trades: 5, loss_trades: 5 })
    expect(structureRows([open], null)[0].winRate).toBeCloseTo(0.5, 6)
    expect(structureRows([CSP], null)[0].winRate).toBeCloseTo(18 / 19, 6)
  })

  it('has no win rate at all when nothing has resolved', () => {
    expect(structureRows([IC], null)[0].winRate).toBeNull()
  })

  it('carries every figure through as the service gave it, nulls included', () => {
    const rich = row({
      structure_name: 'Rich',
      total_instances: 3,
      profit_trades: 2,
      loss_trades: 1,
      total_profit: 100,
      total_loss: -40,
      total_investment: 900,
      profit_investment: 600,
      loss_investment: 300,
      total_max_risk: null,
      structure_return_pct: 6.7,
      single_max_loss_pct: -2.1,
    })
    const r = structureRows([rich], null)[0]
    expect(r.totalProfit).toBe(100)
    expect(r.totalLoss).toBe(-40)
    expect(r.invested).toBe(900)
    expect(r.investedWin).toBe(600)
    expect(r.investedLoss).toBe(300)
    // A covered call has nothing bounding it in cash, and the service says so.
    expect(r.maxRisk).toBeNull()
    expect(r.returnPct).toBe(6.7)
    expect(r.worstPct).toBe(-2.1)
  })
})

describe('neverTraded', () => {
  it('keeps a shape nobody has used, because that is a reading of its own', () => {
    expect(neverTraded(structureRows([CSP, IC], TOTALS)).map((r) => r.name)).toEqual(['Iron Condor'])
  })

  it('never counts the totals row', () => {
    expect(neverTraded(structureRows([], row({ structure_name: 'All structures' })))).toEqual([])
  })
})

describe('cutDisagreement', () => {
  it('states the gap between the two cuts rather than reconciling it', () => {
    const said = cutDisagreement(19, 67, 6, 85)
    expect(said).toContain('67 closed contracts over 19 plays')
    expect(said).toContain('85 closed instances over 6 structures')
    expect(said).toContain('Neither number is wrong')
  })
})
