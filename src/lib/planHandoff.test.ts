import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearPlanHandoffs,
  dismissPlanHandoff,
  listPlanHandoffs,
  plansPath,
  pushPlanHandoff,
} from './planHandoff'

describe('planHandoff', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('queues newest first and upper-cases the symbol', () => {
    pushPlanHandoff({ symbol: 'nvda', source: 'symbol:overview', sourceLabel: 'Symbol · overview' })
    pushPlanHandoff({
      symbol: 'AAPL',
      source: 'symbol:chain',
      sourceLabel: 'Symbol · chain',
      contract: 'AAPL 2026-10-17 200P',
    })
    const items = listPlanHandoffs()
    expect(items).toHaveLength(2)
    expect(items[0].symbol).toBe('AAPL')
    expect(items[0].contract).toBe('AAPL 2026-10-17 200P')
    expect(items[1].symbol).toBe('NVDA')
  })

  it('dismisses by id', () => {
    const a = pushPlanHandoff({ symbol: 'NVDA', source: 's', sourceLabel: 'S' })
    pushPlanHandoff({ symbol: 'AAPL', source: 's', sourceLabel: 'S' })
    dismissPlanHandoff(a.id)
    expect(listPlanHandoffs().map((h) => h.symbol)).toEqual(['AAPL'])
  })

  it('builds the Plans deep link', () => {
    expect(plansPath()).toBe('/trade/plans')
    expect(plansPath('plan-1')).toBe('/trade/plans?handoff=plan-1')
  })

  it('clear empties the queue', () => {
    pushPlanHandoff({ symbol: 'NVDA', source: 's', sourceLabel: 'S' })
    clearPlanHandoffs()
    expect(listPlanHandoffs()).toEqual([])
  })
})
