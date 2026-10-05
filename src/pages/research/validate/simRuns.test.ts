import { describe, expect, it } from 'vitest'
import { curveFrom, exitReasonRows, isSimRun, legsLabel, sampleTone, simStructure } from './simRuns'
import type { SimLeg } from '@/api/research/backtestSim'

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
