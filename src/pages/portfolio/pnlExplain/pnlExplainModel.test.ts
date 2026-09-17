import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import type { AccountTransaction, ByDayRangeData } from '@/types/trading'
import {
  PNL_UNEXPLAINED_THRESHOLD,
  bookGapFills,
  cashInWindow,
  leadsTotal,
  pnlLeads,
  windowBookPnl,
} from './pnlExplainModel'

const DAY = 86_400
const T0 = 1_780_000_000

function fill(over: Partial<Execution> & Pick<Execution, 'exec_id'>): Execution {
  return {
    account_executions_id: 1,
    account_id: 'U0000001',
    contract_key: 'ZZZ  260515C00090000|OPT|20260515|90.0|C',
    symbol: 'ZZZ  260515C00090000',
    sec_type: 'OPT',
    side: 'Sell',
    qty: 1,
    quantity: 1,
    price: 2,
    time: T0,
    commission: 1,
    ...over,
  } as Execution
}

function cash(over: Partial<AccountTransaction>): AccountTransaction {
  return { account_id: 'U0000001', ts: T0, amount: -10, type: 'other', ...over } as AccountTransaction
}

describe('windowBookPnl', () => {
  it('quotes Performance over the four classes it keeps apart, and never counts a day twice', () => {
    const byDay = {
      opt: { '2026-09-10': { realized: 100, unrealized: 20 }, '2026-09-20': { realized: 999, unrealized: 0 } },
      stocks: { '2026-09-10': { realized: 0, unrealized: 30 } },
      // Performance's own alias of `stocks` — counting it as well would double the day.
      stock: { '2026-09-10': { realized: 0, unrealized: 30 } },
      fixed_income: { '2026-09-11': { realized: 5, unrealized: 0 } },
      cash_like: {},
      stkBucketNotional: { stocks: {}, fixed_income: {}, cash_like: {} },
    } as unknown as ByDayRangeData
    // 100 + 20 + 30 + 5 — the 2026-09-20 day is outside the window.
    expect(windowBookPnl(byDay, '2026-09-01', '2026-09-15')).toBe(155)
    expect(windowBookPnl(undefined, '2026-09-01', '2026-09-15')).toBe(0)
  })
})

describe('bookGapFills', () => {
  it('counts every row the book never took in, but only prices the ones carrying a price', () => {
    const inBoth = fill({ exec_id: 'a', account_executions_id: 1 })
    const gaps = bookGapFills(
      [
        inBoth,
        // priced: sold 1 at 2.00 with a 1.00 commission → +199
        fill({ exec_id: 'b', account_executions_id: -2, price: 2 }),
        // a combo wrapper: no price, so it is counted and not summed
        fill({ exec_id: 'c', account_executions_id: -3, price: 0, sec_type: 'BAG' }),
        fill({ exec_id: 'd', account_executions_id: -4, price: 0, symbol: 'YYY  260515P00010000' }),
      ],
      [inBoth],
    )
    expect(gaps.map((g) => g.symbol)).toEqual(['ZZZ', 'YYY'])
    expect(gaps[0]).toMatchObject({ n: 2, priced: 1, amount: 199 })
    expect(gaps[1]).toMatchObject({ n: 1, priced: 0, amount: 0 })
  })
})

describe('cashInWindow', () => {
  it('leaves the Owner’s own money out — returns are ruled net of external cash flow (§14.5)', () => {
    const groups = cashInWindow(
      [
        cash({ type: 'dividend', amount: 40 }),
        cash({ type: 'dividend', amount: 12 }),
        cash({ type: 'other', description: 'WITHHOLDING TAX', amount: -7 }),
        cash({ type: 'deposit', amount: 100_000 }),
        cash({ type: 'withdrawal', amount: -5_000 }),
        cash({ type: 'other', description: 'WITHHOLDING TAX', amount: -900, ts: T0 - 90 * DAY }),
      ],
      T0 - DAY,
      T0 + DAY,
    )
    expect(groups.map((g) => g.type)).toEqual(['Dividend', 'Tax'])
    expect(groups[0]).toMatchObject({ n: 2, amount: 52 })
    expect(groups[1]).toMatchObject({ n: 1, amount: -7 })
  })

  it('reads Transfer & Pay’s own Kind, so a fee and a tax do not share one bucket', () => {
    const groups = cashInWindow(
      [
        cash({ type: 'other', description: 'OPRA TOP OF BOOK', amount: -5 }),
        cash({ type: 'other', description: 'WITHHOLDING TAX', amount: -20 }),
      ],
      T0 - DAY,
      T0 + DAY,
    )
    expect(groups.map((g) => g.type).sort()).toEqual(['Data fee', 'Tax'])
  })

  it('reads the epoch the API sends as a string', () => {
    const groups = cashInWindow([cash({ ts: String(T0) as unknown as number, amount: 5 })], T0 - DAY, T0 + DAY)
    expect(groups[0].n).toBe(1)
  })
})

describe('pnlLeads', () => {
  const gaps = [
    { symbol: 'ZZZ', n: 2, priced: 1, amount: 900 },
    { symbol: 'YYY', n: 3, priced: 0, amount: 0 },
  ]

  it('puts what carries an amount first and leaves a count as a count', () => {
    const leads = pnlLeads({ gaps, cash: [{ type: 'dividend', n: 2, amount: 52 }], unpricedLegs: 4, windowPnl: 10_000 })
    expect(leads.map((l) => l.key)).toEqual(['gap:ZZZ', 'cash:dividend', 'gap:YYY', 'unpriced'])
    expect(leads[0].amount).toBe(900)
    // 900 is more than 5% of 10,000 — worth a look.
    expect(leads[0].reading).toBe('worth a look')
    expect(PNL_UNEXPLAINED_THRESHOLD).toBe(0.05)
    expect(leads[1].reading).toBe('inside tolerance')
    // Cash rows carry no symbol, so they cannot be placed against a name.
    expect(leads[1].symbol).toBeNull()
    expect(leads[2].amount).toBeNull()
    expect(leads[3]).toMatchObject({ amount: null, reading: 'no reading', to: '/portfolio/positions' })
  })

  it('drops the unpriced lead entirely when every leg carries a mark', () => {
    const leads = pnlLeads({ gaps: [], cash: [], unpricedLegs: 0, windowPnl: 100 })
    expect(leads).toEqual([])
  })

  it('sums only what can be summed', () => {
    const leads = pnlLeads({ gaps, cash: [{ type: 'dividend', n: 2, amount: 52 }], unpricedLegs: 4, windowPnl: 10_000 })
    expect(leadsTotal(leads)).toEqual({ amount: 952, withAmount: 2, countOnly: 2 })
  })
})
