import { describe, expect, it } from 'vitest'
import type { Execution, StrategyOpportunity } from '@/types/positions'
import {
  OUTCOME_SAMPLE_FLOOR,
  buildOutcomeInstances,
  cutBySource,
  outcomeExits,
  outcomeGaps,
  scopeOutcome,
  unattributedCloses,
} from './outcomeModel'

const DAY = 86_400
const T0 = 1_780_000_000

function fill(over: Partial<Execution> & Pick<Execution, 'contract_key'>): Execution {
  return {
    account_executions_id: 1,
    account_id: 'U0000001',
    symbol: 'ZZZ',
    sec_type: 'OPT',
    side: 'Sell',
    qty: 1,
    quantity: 1,
    price: 2,
    time: T0,
    transaction_type: 'ExchTrade',
    source: 'flex_trades',
    commission: -1,
    strategy_opportunity_id: 1,
    strategy_opportunity_name: 'ZZZ Covered Call book',
    ...over,
  } as Execution
}

const OPPS = [
  { strategy_opportunity_id: 1, name: 'ZZZ Covered Call book', scope_type: 'watchlist_stk', structure_name: 'Covered Call 10% OTM' },
  { strategy_opportunity_id: 2, name: 'YYY Put book', scope_type: 'explicit_symbols', structure_name: 'Cash Secured Put' },
] as unknown as StrategyOpportunity[]

describe('buildOutcomeInstances', () => {
  it('closes an instance only when every contract nets to zero, and sums the ledger cash flow', () => {
    const rows = buildOutcomeInstances({
      executions: [
        // sold for 2.00, bought back at 0.50 — closed
        fill({ contract_key: 'k1', strategy_instance_id: 11, time: T0, side: 'Sell', price: 2 }),
        fill({ contract_key: 'k1', strategy_instance_id: 11, time: T0 + 10 * DAY, side: 'Buy', price: 0.5, transaction_type: 'ExchTrade' }),
        // still short one contract — not closed
        fill({ contract_key: 'k2', strategy_instance_id: 12, time: T0, side: 'Sell', price: 3 }),
      ],
      opportunities: OPPS,
    })
    expect(rows.map((r) => r.instanceId)).toEqual([11])
    // (200 − 1) + (−50 − 1)
    expect(rows[0].realised).toBe(148)
    expect(rows[0].daysHeld).toBe(10)
    expect(rows[0].exit).toBe('closed_early')
    expect(rows[0].source).toBe('Watchlist')
  })

  it('reads the exit from the last fill: a journal row is expired or written off, not a trade', () => {
    const rows = buildOutcomeInstances({
      executions: [
        fill({ contract_key: 'k1', strategy_instance_id: 11, side: 'Sell', price: 1 }),
        fill({
          contract_key: 'k1',
          strategy_instance_id: 11,
          time: T0 + DAY,
          side: 'Buy',
          price: 0,
          commission: 0,
          transaction_type: 'BookTrade',
          source: 'journal_closed',
        }),
      ],
      opportunities: OPPS,
    })
    expect(rows[0].exit).toBe('expired')
    expect(rows[0].realised).toBe(99)
  })

  it('an instance on no opportunity says so rather than guessing where it came from', () => {
    const rows = buildOutcomeInstances({
      executions: [
        fill({ contract_key: 'k1', strategy_instance_id: 13, side: 'Sell', price: 1, strategy_opportunity_id: null, strategy_opportunity_name: null }),
        fill({ contract_key: 'k1', strategy_instance_id: 13, time: T0 + DAY, side: 'Buy', price: 1, strategy_opportunity_id: null, strategy_opportunity_name: null }),
      ],
      opportunities: OPPS,
    })
    expect(rows[0].source).toBe('No opportunity')
    expect(rows[0].opportunityName).toBeNull()
  })

  it('reads the underlying off the OCC string, and writes the contract as the §14.4 token', () => {
    const ck = 'ZZZ  260515C00090000|OPT|20260515|90.0|C'
    const rows = buildOutcomeInstances({
      executions: [
        fill({ contract_key: ck, symbol: 'ZZZ  260515C00090000', strategy_instance_id: 14, side: 'Sell', price: 1 }),
        fill({ contract_key: ck, symbol: 'ZZZ  260515C00090000', strategy_instance_id: 14, time: T0 + DAY, side: 'Buy', price: 1 }),
      ],
      opportunities: OPPS,
    })
    expect(rows[0].symbols).toEqual(['ZZZ'])
    expect(rows[0].contracts).toEqual(['ZZZ 15MAY26 90C'])
    expect(rows[0].structureName).toBe('Covered Call 10% OTM')
  })
})

describe('the cut and its sample floor', () => {
  const rows = [
    { source: 'Watchlist', realised: 100 },
    { source: 'Watchlist', realised: -40 },
    { source: 'Chosen by hand', realised: 60 },
  ].map((r, i) => ({ ...(buildRow(i) as object), ...r })) as ReturnType<typeof buildOutcomeInstances>

  function buildRow(i: number) {
    return {
      instanceId: i,
      symbols: ['ZZZ'],
      contracts: ['ZZZ 15MAY26 90C'],
      accountId: 'U0000001',
      opportunityName: null,
      structureName: null,
      openedAt: T0,
      closedAt: T0 + DAY,
      daysHeld: 1,
      fills: 2,
      exit: 'closed_early' as const,
    }
  }

  it('counts wins and leaves the hit rate unread under the sample floor', () => {
    const groups = cutBySource(rows)
    expect(groups.map((g) => g.key)).toEqual(['Watchlist', 'Chosen by hand'])
    expect(groups[0].n).toBe(2)
    expect(groups[0].wins).toBe(1)
    expect(groups[0].hitRate).toBeNull()
    expect(groups[0].realised).toBe(60)
    expect(groups[0].worst).toBe(-40)
    // A group with no losing close reads its smallest win, never a zero it never had.
    expect(groups[1].worst).toBe(60)
    expect(OUTCOME_SAMPLE_FLOOR).toBe(10)
  })

  it('reads a rate once the sample carries one', () => {
    const many = Array.from({ length: OUTCOME_SAMPLE_FLOOR }, (_, i) => ({ ...rows[0], instanceId: i, realised: i < 7 ? 10 : -5 }))
    const [g] = cutBySource(many)
    expect(g.hitRate).toBeCloseTo(0.7)
  })
})

describe('exits, scope and gaps', () => {
  const rows = [
    { instanceId: 1, exit: 'expired' as const, realised: 100, closedAt: T0 },
    { instanceId: 2, exit: 'closed_early' as const, realised: -30, closedAt: T0 - 40 * DAY },
    { instanceId: 3, exit: 'expired' as const, realised: 50, closedAt: T0 },
  ].map((r) => ({ ...r, symbols: ['ZZZ'], contracts: ['ZZZ 15MAY26 90C'], accountId: 'U0', opportunityName: null, structureName: null, source: 'No opportunity' as const, openedAt: T0, daysHeld: 1, fills: 2 }))

  it('keeps every bucket, with a dash where nothing landed', () => {
    const buckets = outcomeExits(rows, 2)
    expect(buckets.map((b) => b.key)).toEqual(['expired', 'closed_early', 'assigned', 'unknown', 'none'])
    expect(buckets[0]).toMatchObject({ n: 2, realised: 150, avg: 75 })
    expect(buckets[2]).toMatchObject({ n: 0, avg: null })
    expect(buckets[4]).toMatchObject({ n: 2 })
  })

  it('scopes by when it closed', () => {
    expect(scopeOutcome(rows, 31, T0).map((r) => r.instanceId)).toEqual([1, 3])
    expect(scopeOutcome(rows, null, T0)).toHaveLength(3)
  })

  it('counts a contract that closed with no instance behind it', () => {
    const n = unattributedCloses([
      fill({ contract_key: 'lonely', side: 'Sell', price: 1 }),
      fill({ contract_key: 'lonely', side: 'Buy', price: 1, time: T0 + DAY }),
      fill({ contract_key: 'owned', strategy_instance_id: 9, side: 'Sell', price: 1 }),
      fill({ contract_key: 'owned', strategy_instance_id: 9, side: 'Buy', price: 1, time: T0 + DAY }),
    ])
    expect(n).toBe(1)
  })

  it('names the gaps, and says which are unknown rather than wrong', () => {
    const gaps = outcomeGaps(rows, 1)
    expect(gaps.map((g) => g.what)).toEqual([
      'Closed with no instance',
      'Instance with no plan',
      'Idea with no run behind it',
      'Closed on no opportunity',
    ])
    expect(gaps[1].tone).toBe('unknown')
    expect(gaps[1].n).toBe(3)
    expect(gaps[0].tone).toBe('warn')
  })
})
