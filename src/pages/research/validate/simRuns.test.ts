import { describe, expect, it } from 'vitest'
import {
  ONE_SIDED,
  curveFrom,
  diffLabel,
  exitReasonRows,
  isSimRun,
  legsLabel,
  pineExitRows,
  sampleTone,
  simStructure,
} from './simRuns'
import type { SimLeg } from '@/api/research/backtestSim'
import { pricePlots } from '@/api/research/pine'

const leg = (over: Partial<SimLeg>): SimLeg => ({
  label: 'x',
  ticker: 'O:X',
  right: 'P',
  side: 'sell',
  strike: 100,
  expiry: '2025-03-21',
  qty: 1,
  entry_fill: 1,
  exit_fill: 0.5,
  entry_iv: 0.3,
  entry_delta: -0.2,
  ...over,
})

describe('simRuns', () => {
  it('tells sim runs from event runs by template', () => {
    expect(isSimRun({ strategy_template: 'sim:iron_condor' })).toBe(true)
    expect(isSimRun({ strategy_template: 'short_30d_iron_condor' })).toBe(false)
    expect(simStructure({ strategy_template: 'sim:short_put' })).toBe('short_put')
  })

  it('measures P&L from the first point and drawdown from the running peak', () => {
    const c = curveFrom([
      { as_of: '2025-01-02', equity: 100000, margin_used: 0, open_positions: 0 },
      { as_of: '2025-01-03', equity: 100300, margin_used: 0, open_positions: 1 },
      { as_of: '2025-01-06', equity: 100100, margin_used: 0, open_positions: 1 },
    ])
    expect(c.pnl).toEqual([0, 300, 100])
    expect(c.drawdown).toEqual([0, 0, -200])
    expect([c.first, c.last]).toEqual(['2025-01-02', '2025-01-06'])
    expect(curveFrom([]).pnl).toEqual([])
  })

  it('orders exit reasons largest first', () => {
    expect(exitReasonRows({ stop: 2, profit_take: 9, dte_exit: 2 })).toEqual([
      ['profit_take', 9],
      ['dte_exit', 2],
      ['stop', 2],
    ])
  })

  it('writes strikes puts first, shorts marked', () => {
    expect(
      legsLabel([
        leg({ right: 'C', strike: 120 }),
        leg({ right: 'P', strike: 90, side: 'buy' }),
        leg({ right: 'P', strike: 95 }),
        leg({ right: 'C', strike: 125, side: 'buy' }),
      ])
    ).toBe('+90P −95P −120C +125C')
    expect(legsLabel([])).toBe('—')
  })

  it('flags small samples', () => {
    expect(sampleTone('noise')).toBe('destructive')
    expect(sampleTone('thin')).toBe('warning')
    expect(sampleTone('ok')).toBeNull()
  })
})

describe('Pine exit and Pine line readers (research 0.178.0)', () => {
  it('offers only price lines to place a strike against', () => {
    expect(pricePlots({ plots: ['upper', 'lower'], overlay: true })).toEqual(['upper', 'lower'])
    expect(pricePlots({ plots: ['wt1', 'wt2'], overlay: false })).toEqual([])
    expect(pricePlots({})).toEqual([]) // research before 0.183.0 sends neither
    expect(pricePlots(undefined)).toEqual([])
    expect(ONE_SIDED.has('call_credit_spread') && !ONE_SIDED.has('iron_condor')).toBe(true)
  })

  it('reads the comparison Pine exit first, with signed differences', () => {
    const side = { n_trades: 17, win_rate: 0.88, total_pnl: 3514, avg_pnl: 206.7, avg_days_held: 15.6, worst_trade: -223, max_drawdown: -1394 }
    const rows = pineExitRows({
      premium_only: side,
      with_pine_exit: { ...side, win_rate: 0.82, total_pnl: 2937, avg_pnl: 172.8, avg_days_held: 14.8, exit_reasons: { pine_exit: 1 } },
      delta: {},
      paired: { n: 17, exits_changed: 1, avg_pnl_diff: -34, avg_pnl_diff_ci95: [-102, 0], only_premium_only: 0, only_with_pine_exit: 0 },
    })
    const by = Object.fromEntries(rows.map((r) => [r.k, r]))
    expect(by['Closed by Pine'].pine).toBe('1')
    expect(diffLabel(by['Total P&L'])).toBe('−$577')
    expect(diffLabel(by['Win rate'])).toBe('-6 pt')
    expect(diffLabel(by['Trades'])).toBe('0')
    expect(by['Trades'].diff).toBe(0)
    expect(diffLabel(by['Days held'])).toBe('-0.8')
  })
})
