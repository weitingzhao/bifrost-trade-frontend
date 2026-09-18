import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { buildFillRows, buildPlanRows, importRows, orphanReason, scopeFills, summarize } from './fillsModel'

const T0 = 1_780_000_000

function fill(over: Partial<Execution> & Pick<Execution, 'exec_id'>): Execution {
  return {
    account_executions_id: 1,
    account_id: 'U0000001',
    contract_key: 'ZZZ|OPT|20261016|90.0|C',
    symbol: 'ZZZ  261016C00090000',
    sec_type: 'OPT',
    side: 'Sell',
    qty: 2,
    quantity: 2,
    price: 1.5,
    time: T0,
    trade_date: '2026-09-16',
    commission: -1.25,
    source: 'flex_trades',
    ...over,
  } as Execution
}

function plan(over: Partial<StrategyPlan> & Pick<StrategyPlan, 'strategy_plan_id'>): StrategyPlan {
  return { symbol: 'ZZZ', account_id: 'U0000001', status: 'open', ...over } as StrategyPlan
}

describe('buildFillRows', () => {
  it('reads a fill the way a desk does, newest first, with the commission as a cost either way', () => {
    const rows = buildFillRows([
      fill({ exec_id: 'a', time: T0 }),
      fill({ exec_id: 'b', time: T0 + 60, side: 'Buy', commission: 1.25 }),
    ])
    expect(rows.map((r) => r.side)).toEqual(['BUY', 'SELL'])
    // The sources disagree on the sign; both are $1.25 out of the account.
    expect(rows.map((r) => r.fees)).toEqual([1.25, 1.25])
    expect(rows[0]).toMatchObject({ symbol: 'ZZZ', qty: 2, price: 1.5, source: 'flex_trades' })
  })

  it('calls a fill with no instance an orphan and says what is missing', () => {
    const [orphan, linked] = buildFillRows(
      [
        fill({ exec_id: 'a', time: T0 + 60 }),
        fill({ exec_id: 'b', time: T0, strategy_instance_id: 11, strategy_instance_label: 'ZZZ CC' }),
      ],
      [plan({ strategy_plan_id: 1, symbol: 'YYY' })],
    )
    expect(orphan.state).toBe('orphan')
    expect(orphan.why).toBe('no instance · no plan on ZZZ')
    expect(linked).toMatchObject({ state: 'linked', instanceId: 11, instanceLabel: 'ZZZ CC', why: null })
  })

  it('separates “nobody wrote this down” from “somebody did and it never linked”', () => {
    const planned = new Set(['ZZZ'])
    expect(orphanReason(fill({ exec_id: 'a' }), planned)).toBe('no instance · a plan exists on ZZZ')
    expect(orphanReason(fill({ exec_id: 'a' }), new Set())).toBe('no instance · no plan on ZZZ')
  })
})

describe('scopeFills', () => {
  const rows = buildFillRows([
    fill({ exec_id: 'a', trade_date: '2026-09-16' }),
    fill({ exec_id: 'b', trade_date: '2026-09-10' }),
    fill({ exec_id: 'c', trade_date: '2026-08-01' }),
  ])

  it('scopes by the trade date the source stamped', () => {
    expect(scopeFills(rows, 1, '2026-09-17').map((r) => r.tradeDate)).toEqual(['2026-09-16'])
    expect(scopeFills(rows, 30, '2026-09-17')).toHaveLength(2)
    expect(scopeFills(rows, null, '2026-09-17')).toHaveLength(3)
  })
})

describe('summarize', () => {
  it('counts the window and still reports the newest fill the book has', () => {
    const all = buildFillRows([
      fill({ exec_id: 'a', trade_date: '2026-09-16', strategy_instance_id: 11 }),
      fill({ exec_id: 'b', trade_date: '2026-09-16', source: 'tws_client' }),
      fill({ exec_id: 'c', trade_date: '2026-08-01' }),
    ])
    const scoped = scopeFills(all, 30, '2026-09-17')
    const s = summarize(scoped, all)
    expect(s).toMatchObject({ rows: 2, linked: 1, orphan: 1, newestTradeDate: '2026-09-16' })
    expect(s.bySource).toEqual([
      { source: 'flex_trades', n: 1 },
      { source: 'tws_client', n: 1 },
    ])
  })

  it('still names the newest fill when the window itself is empty', () => {
    const all = buildFillRows([fill({ exec_id: 'a', trade_date: '2026-08-01' })])
    const s = summarize(scopeFills(all, 1, '2026-09-17'), all)
    expect(s.rows).toBe(0)
    expect(s.newestTradeDate).toBe('2026-08-01')
  })
})

describe('buildPlanRows', () => {
  it('keeps a cancelled plan — it is still a thing that was written — and reads its target', () => {
    const rows = buildPlanRows([
      plan({
        strategy_plan_id: 2,
        status: 'cancelled',
        effective_status: 'cancelled',
        structure_label: 'Cash Secured Put',
        limit_price: 3.4,
        target_kind: 'credit_pct',
        target_value: 50,
      }),
      plan({ strategy_plan_id: 1 }),
    ])
    expect(rows.map((r) => r.id)).toEqual([2, 1])
    expect(rows[0]).toMatchObject({
      symbol: 'ZZZ',
      status: 'cancelled',
      target: 'credit_pct 50',
      stop: null,
      limit: 3.4,
      filled: false,
    })
  })
})

describe('importRows', () => {
  const FRESH = [
    { source: 'flex_trades', account_id: 'U1', days_since_latest: 1.3 },
    { source: 'flex_trades', account_id: 'U2', days_since_latest: 22.2 },
    { source: 'tws_client', account_id: 'U1', days_since_latest: 125.7 },
  ]

  it('reads a quiet TWS as idle, never as degraded — Flex is the record, TWS the supplement', () => {
    const [tws] = importRows({ freshness: FRESH, flexRunTs: null, todayBySource: new Map(), todayUtc: '2026-09-18' })
    expect(tws.lamp).toBe('gray')
    expect(tws.sub).toMatch(/newest 126d ago/)
  })

  it('greens the Flex row when its own coverage stamp is from today', () => {
    const rows = importRows({
      freshness: FRESH,
      flexRunTs: '2026-09-18T10:30:20Z',
      todayBySource: new Map([['flex_trades', 3]]),
      todayUtc: '2026-09-18',
    })
    const flex = rows.find((r) => r.key === 'flex')!
    expect(flex.lamp).toBe('green')
    expect(flex.title).toBe('Flex · 3 rows today')
    expect(flex.when).toBe('10:30Z')
  })

  it('ambers a Flex pull that has not run today, naming the day it last did', () => {
    const flex = importRows({ freshness: FRESH, flexRunTs: '2026-09-16T10:30:00Z', todayBySource: new Map(), todayUtc: '2026-09-18' }).find(
      (r) => r.key === 'flex',
    )!
    expect(flex.lamp).toBe('yellow')
    expect(flex.sub).toContain('2026-09-16')
  })

  it('keeps corporate actions grey and says grey means unknown, not down', () => {
    const corp = importRows({ freshness: [], flexRunTs: null, todayBySource: new Map(), todayUtc: '2026-09-18' }).find(
      (r) => r.key === 'corp',
    )!
    expect(corp.lamp).toBe('gray')
    expect(corp.sub).toMatch(/unknown, not down/)
  })
})
