import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { fillRisk, takenToday, weekOf } from './sizingTodayModel'

// Invented fills. 2026-09-29 is a Tuesday; 14:00 UTC is 10:00 in New York.
const TUE_10 = Date.UTC(2026, 8, 29, 14) / 1000
const MON_10 = Date.UTC(2026, 8, 28, 14) / 1000

function fill(over: Partial<Execution>): Execution {
  return {
    account_executions_id: 1,
    account_id: 'UTEST1',
    contract_key: 'X',
    symbol: 'ABC',
    sec_type: 'OPT',
    side: 'Sell',
    qty: 1,
    quantity: 1,
    price: 2,
    time: TUE_10,
    option_right: 'P',
    strike: 50,
    expiry: '2026-10-16',
    realized_pnl: 0,
    ...over,
  }
}

describe('fillRisk', () => {
  it('prices a sold put at strike less credit', () => {
    expect(fillRisk(fill({ quantity: 2 })).risk).toBe(9600)
  })
  it('prices shares bought at cost and an option bought at its premium', () => {
    expect(fillRisk(fill({ sec_type: 'STK', side: 'Buy', quantity: 10, price: 30 })).risk).toBe(300)
    expect(fillRisk(fill({ side: 'Buy', price: 1.5 })).risk).toBe(150)
  })
  it('reads a close as no budget and leaves a short call unpriced', () => {
    expect(fillRisk(fill({ side: 'Buy', realized_pnl: 40 }))).toEqual({ risk: 0, note: 'close — no budget' })
    expect(fillRisk(fill({ option_right: 'C' })).risk).toBeNull()
  })
})

describe('takenToday', () => {
  it('keeps today in New York, newest first, with the total accruing in time order', () => {
    const rows = takenToday(
      [
        fill({ exec_id: 'a', time: TUE_10 }),
        fill({ exec_id: 'b', time: TUE_10 + 600, sec_type: 'STK', side: 'Buy', quantity: 10, price: 30 }),
        fill({ exec_id: 'old', time: MON_10 }),
      ],
      '2026-09-29',
    )
    expect(rows.map((r) => r.key)).toEqual(['b', 'a'])
    expect(rows.map((r) => r.cum)).toEqual([5100, 4800])
  })
})

describe('weekOf', () => {
  it('draws Monday through today and sums each day', () => {
    const week = weekOf([fill({ time: MON_10 }), fill({ time: TUE_10, quantity: 2 })], '2026-09-29')
    expect(week.map((d) => [d.label, d.risk])).toEqual([
      ['Mon', 4800],
      ['today', 9600],
    ])
  })
})
