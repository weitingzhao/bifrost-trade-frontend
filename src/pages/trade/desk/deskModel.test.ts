import { describe, expect, it } from 'vitest'
import { buildLanes, decideItems, executeItems, expiringItem, needsYou, settleItems } from './deskModel'
import type { ShortLeg } from '@/api/shortLegs'
import type { OrderIntentDraft } from '@/api/research/orderIntents'
import type { Execution } from '@/types/positions'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'

const TODAY = '2026-09-18'
const TIGHT = 0.03

function leg(p: Partial<ShortLeg> & { symbol: string }): ShortLeg {
  return { expiry: '20261120', strike: 100, right: 'P', qty: -1, spot: 200, ...p }
}

function intent(p: Partial<OrderIntentDraft> = {}): OrderIntentDraft {
  return {
    id: 'drf_1',
    kind: 'order_intent',
    payload: { strategy_template: 'PullbackLimitLongStock', legs: [{ symbol: 'RVTY' }], rationale: 'First. Second.' },
    scope: 'hypothesis:rvty-stage-2a',
    status: 'pending',
    generated_by: 'loop_curator',
    linked_action_id: null,
    created_at: '2026-09-17T13:32:18Z',
    expires_at: null,
    ...p,
  }
}

function exec(p: Partial<Execution> = {}): Execution {
  return { trade_date: '2026-09-17', symbol: 'MU', strategy_instance_id: 11, ...p } as Execution
}

function plan(p: Partial<StrategyPlan> = {}): StrategyPlan {
  return {
    strategy_plan_id: 9,
    symbol: 'MU',
    structure_label: 'Cash-secured put',
    qty: 2,
    effective_status: 'intended',
    status: 'intended',
    intended_at: '2026-09-17T12:00:00Z',
    ...p,
  } as StrategyPlan
}

describe('decide lane', () => {
  it('carries a Research proposal with the D10 tag its own envelope asserts', () => {
    const [item] = decideItems([intent()], [], TIGHT, TODAY)
    expect(item.symbol).toBe('RVTY')
    expect(item.tags.map((t) => t.label)).toEqual(['advisory', 'D10 blocked'])
    expect(item.actions.map((a) => a.kind)).toContain('createOpportunity')
  })

  it('cuts a long rationale at its first sentence rather than printing the essay', () => {
    const [item] = decideItems([intent()], [], TIGHT, TODAY)
    expect(item.sub).toBe('First.')
  })

  it('says so when an intent carries no rationale, instead of an empty line', () => {
    const [item] = decideItems([intent({ payload: { strategy_template: 'X', legs: [] } })], [], TIGHT, TODAY)
    expect(item.sub).toMatch(/No rationale recorded/)
  })

  it('raises a short leg inside the cushion line and leaves a comfortable one alone', () => {
    // Put struck at 100 against spot 200 is 50% clear; struck at 199 is 0.5%.
    const items = decideItems([], [leg({ symbol: 'SAFE' }), leg({ symbol: 'TIGHT', strike: 199 })], TIGHT, TODAY)
    expect(items.map((i) => i.symbol)).toEqual(['TIGHT'])
  })

  it('calls an in-the-money leg breached, not merely tight', () => {
    const [item] = decideItems([], [leg({ symbol: 'ITM', strike: 260 })], TIGHT, TODAY)
    expect(item.tone).toBe('danger')
    expect(item.sub).toMatch(/In the money/)
  })

  it('counts a leg with no spot as unknown — never as a safe one', () => {
    const items = decideItems([], [leg({ symbol: 'NOQ', spot: null })], TIGHT, TODAY)
    expect(items).toHaveLength(1)
    expect(items[0].key).toBe('legs:unpriced')
    expect(items[0].tone).toBe('neutral')
  })
})

describe('execute lane', () => {
  it('lists an intended plan as not sent, because the desk copies and TWS places', () => {
    const [item] = executeItems([plan()], [], () => null)
    expect(item.tags.map((t) => t.label)).toEqual(['not sent'])
    expect(item.actions[0].to).toBe('/trade/plans?plan=9')
  })

  it('says which plans no rule covers, in the words Plans uses', () => {
    const [item] = executeItems([plan()], [], () => 'No opportunity covers MU — a hand plan.')
    expect(item.sub).toBe('No opportunity covers MU — a hand plan.')
    expect(item.tags.map((t) => t.label)).toContain('outside rules')
  })

  it('ignores a plan that is not intended — a cancelled plan is not out for a fill', () => {
    expect(executeItems([plan({ effective_status: 'cancelled' })], [], () => null)).toEqual([])
  })

  it('shows what IB is working, and sends the reader to TWS for it', () => {
    const [item] = executeItems([], [{ order_id: 8813, symbol: 'TSLA', action: 'SELL', total_quantity: 4, filled: 0 }], () => null)
    expect(item.when).toBe('ord 8813')
    expect(item.sub).toMatch(/0 of 4 filled/)
  })
})

describe('settle lane', () => {
  it('groups the window’s fills into claimed and unclaimed rather than listing them', () => {
    const items = settleItems([exec(), exec({ strategy_instance_id: null, symbol: 'GOOG' })], TODAY)
    expect(items.map((i) => i.key)).toEqual(['fills:linked', 'fills:orphan'])
    expect(items[1].tone).toBe('warning')
  })

  it('leaves out a fill older than the window — settled is about the last few sessions', () => {
    expect(settleItems([exec({ trade_date: '2026-06-01' })], TODAY)).toEqual([])
  })

  it('raises a leg expiring within the window and names how near the nearest is', () => {
    const item = expiringItem([leg({ symbol: 'NVDA', expiry: '20260921' })], TODAY)
    expect(item?.when).toBe('3d')
    expect(item?.tone).toBe('warning')
  })

  it('has nothing to say about an expiry a month out', () => {
    expect(expiringItem([leg({ symbol: 'AMD', expiry: '20261120' })], TODAY)).toBeNull()
  })
})

describe('lanes', () => {
  const empty = buildLanes({
    intents: [],
    legs: [],
    tightPct: TIGHT,
    plans: [],
    orders: [],
    fills: [],
    outsideRules: () => null,
    today: TODAY,
  })

  it('gives an empty lane a reading of its own rather than a blank panel', () => {
    for (const lane of empty) {
      expect(lane.items).toHaveLength(0)
      expect(lane.emptyRead.length).toBeGreaterThan(20)
    }
  })

  it('counts nothing as waiting when nothing is', () => {
    expect(needsYou(empty)).toEqual({ n: 0, note: 'nothing is waiting on you' })
  })

  it('leaves a claimed fill and an unpriced leg out of what is on you', () => {
    // Both are readings, neither is a call to act; counting them would turn
    // the number into a lane total.
    const lanes = buildLanes({
      intents: [],
      legs: [leg({ symbol: 'NOQ', spot: null })],
      tightPct: TIGHT,
      plans: [],
      orders: [],
      fills: [exec()],
      outsideRules: () => null,
      today: TODAY,
    })
    expect(needsYou(lanes).n).toBe(0)
  })

  it('counts a proposal, an intent out for a fill and an unclaimed fill', () => {
    const lanes = buildLanes({
      intents: [intent()],
      legs: [],
      tightPct: TIGHT,
      plans: [plan()],
      orders: [],
      fills: [exec({ strategy_instance_id: null })],
      outsideRules: () => null,
      today: TODAY,
    })
    const n = needsYou(lanes)
    expect(n.n).toBe(3)
    expect(n.note).toBe('1 to decide · 1 out for a fill · 1 to settle')
  })
})

describe('what is in force', () => {
  // The cross-check itself lives on the page, but the rule it encodes is worth
  // stating once here: a successful empty response and an empty book are the
  // same bytes, and only another count that arrived in the same batch can tell
  // them apart.
  it('is only unread when another row of the same batch did arrive', () => {
    const unread = (opportunities: number, instances: number) => opportunities > 0 && instances === 0
    expect(unread(7, 0)).toBe(true)
    // A rulebook with nothing in it at all is not the service failing.
    expect(unread(0, 0)).toBe(false)
    expect(unread(7, 87)).toBe(false)
  })
})

describe('the name a desk row can open', () => {
  // The label and the link are different questions: "MU · 2 more" is a good
  // label and a bad destination, and a row built from an import carries a
  // word that is not a ticker at all.
  it('gives a one-name row its own name', () => {
    const items = decideItems(
      [],
      [
        { symbol: 'NVDA', right: 'P', strike: 165, qty: -2, expiry: '2026-10-16', spot: 168, contract_key: 'k1' },
      ] as never,
      0.05,
      '2026-09-21',
    )
    expect(items[0]?.name).toBe('NVDA')
    expect(items[0]?.symbol).toBe('NVDA')
  })

  it('gives a row that stands for several names none', () => {
    const items = decideItems(
      [],
      [
        { symbol: 'NVDA', right: 'P', strike: 165, qty: -2, expiry: '2026-10-16', spot: null, contract_key: 'k1' },
        { symbol: 'AMD', right: 'P', strike: 140, qty: -1, expiry: '2026-10-16', spot: null, contract_key: 'k2' },
      ] as never,
      0.05,
      '2026-09-21',
    )
    const unpriced = items.find((i) => i.key === 'legs:unpriced')
    expect(unpriced?.symbol).toBe('NVDA · 1 more')
    expect(unpriced?.name).toBeNull()
  })
})

describe('a draft with no legs', () => {
  const draft = (scope: string) =>
    [{ id: 'd1', scope, created_at: '2026-09-21T00:00:00Z', payload: { strategy_template: 'Watch' } }] as never

  it('takes the name off the scope when the scope is a name', () => {
    // Invented, not copied: the shape is `hypothesis:<sym>-<slug>`.
    const [item] = decideItems(draft('hypothesis:vnce-stage2a'), [], 0.05, '2026-09-21')
    expect(item.symbol).toBe('VNCE')
    expect(item.name).toBe('VNCE')
  })

  it('opens nothing when the scope is not a name', () => {
    const [none] = decideItems(draft(''), [], 0.05, '2026-09-21')
    expect(none.symbol).toBe('IDEA')
    expect(none.name).toBeNull()
    const [phrase] = decideItems(draft('hypothesis:earnings season'), [], 0.05, '2026-09-21')
    expect(phrase.name).toBeNull()
  })
})
