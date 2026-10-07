import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import type { GateSetFull, StrategyAllocation, Trade } from '@/types/strategy'
import { allocationGateReadings, runningGate } from './useLimitBook'

// Invented allocations (fixtures are never copied from DEV).
const alloc = (id: number, gate: number | null, is_active = true): StrategyAllocation => ({
  strategy_allocation_id: id,
  name: `A${id}`,
  strategy_opportunity_ids: [],
  gate_safety_strategy_id: gate,
  gate_safety_name: null,
  max_positions: null,
  max_bp_pct: null,
  allocation_limits: null,
  is_active,
  created_at: '2031-03-04T14:30:00Z',
  updated_at: '2031-03-04T14:30:00Z',
})

describe('runningGate', () => {
  it('takes what the daemon settings point at, not the first allocation on the books', () => {
    const books = [alloc(1, 10), alloc(2, 20)]
    const got = runningGate(books, { allocation: { id: 2 }, gate_safety: { id: 20 } })
    expect(got.allocation?.strategy_allocation_id).toBe(2)
    expect(got.gateId).toBe(20)
  })

  it('reads no gate when the settings carry none — the daemon then runs its config file', () => {
    const got = runningGate([alloc(1, 10)], { allocation: { id: null }, gate_safety: { id: null } })
    expect(got).toEqual({ allocation: null, gateId: null })
    expect(runningGate([alloc(1, 10)], undefined)).toEqual({ allocation: null, gateId: null })
  })
})

// TD-213: the daily-loss line reads the trades that closed today, not every
// trade the allocation ever closed. Invented trades, fills and dates.
describe('allocationGateReadings — daily loss is today\'s', () => {
  const TODAY = '2031-03-05'
  const YESTERDAY = '2031-03-04'
  const gate = { name: 'G', version: 3, gates: { guard: { risk: { max_daily_loss_usd: 500 } } } } as unknown as GateSetFull
  const allocation = { ...alloc(1, 10), strategy_opportunity_ids: [7], max_positions: 4 }
  const trade = (id: number, closedOn: string | null, opp = 7): Trade =>
    ({
      trade_id: id,
      strategy_opportunity_id: opp,
      strategy_opportunity_name: null,
      strategy_structure_id: null,
      strategy_structure_name: null,
      account_id: 'U0000000',
      opened_at: '2031-03-01T15:00:00Z',
      label: null,
      created_at: '2031-03-01T15:00:00Z',
      updated_at: '2031-03-01T15:00:00Z',
      state: closedOn == null ? 'open' : 'closed',
      closed_on: closedOn,
    }) as Trade
  // One option round trip: sold at `sell`, bought back at `buy` (per share).
  const roundTrip = (tradeId: number, sell: number, buy: number, buyDay: string): Execution[] =>
    [
      { side: 'SLD', price: sell, trade_date: '2031-03-01' },
      { side: 'BOT', price: buy, trade_date: buyDay },
    ].map(
      (f, i) =>
        ({
          account_executions_id: tradeId * 10 + i,
          account_id: 'U0000000',
          contract_key: `ZZQ|OPT|20310321|50|P#${tradeId}`,
          symbol: 'ZZQ',
          sec_type: 'OPT',
          quantity: 1,
          commission: 0,
          time: null,
          trade_id: tradeId,
          ...f,
        }) as Execution,
    )
  const read = (trades: Trade[], executions: Execution[]) =>
    allocationGateReadings({ allocation, gate, trades, executions, paperTrade: true, today: TODAY })

  it('a large loss closed yesterday is not today\'s loss', () => {
    // Trade 1 lost $2,000 yesterday; trade 2 is still open but filled today.
    const execs = [...roundTrip(1, 1, 21, YESTERDAY), { ...roundTrip(2, 3, 0, TODAY)[0], trade_date: TODAY }]
    const got = read([trade(1, YESTERDAY), trade(2, null)], execs)
    expect(got.lossToday).toBe(0)
    expect(got.openTrades).toBe(1)
  })

  it('only the trade closed today counts', () => {
    // Yesterday: +$1,900 (would mask today's loss in a lifetime sum). Today: −$700.
    const execs = [...roundTrip(1, 20, 1, YESTERDAY), ...roundTrip(2, 2, 9, TODAY)]
    const got = read([trade(1, YESTERDAY), trade(2, TODAY)], execs)
    expect(got.lossToday).toBe(-700)
  })

  it('reads nothing until a fill booked to a trade today arrives', () => {
    const got = read([trade(1, YESTERDAY)], roundTrip(1, 1, 21, YESTERDAY))
    expect(got.lossToday).toBeNull()
  })

  it('ignores trades of other opportunities', () => {
    const execs = [...roundTrip(1, 2, 9, TODAY), ...roundTrip(2, 2, 4, TODAY)]
    const got = read([trade(1, TODAY, 99), trade(2, TODAY)], execs)
    expect(got.lossToday).toBe(-200)
  })
})
