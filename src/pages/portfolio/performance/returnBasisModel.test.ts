import { describe, expect, it } from 'vitest'
import type { AccountTransaction } from '@/types/trading'
import type { NavRow } from '@/lib/schemas/snapshots'
import { externalFlows, nyDateOf, returnBasisFromNav } from './returnBasisModel'

// Invented balances.
const nav = (snapshot_date: string, account_id: string, net_liquidation: number): NavRow => ({
  snapshot_date,
  account_id,
  net_liquidation,
})

describe('externalFlows', () => {
  it('keeps deposits and withdrawals only, dated in New York', () => {
    const t = (over: Partial<AccountTransaction>) =>
      ({ account_id: 'UZZ1', ts: '1949103000', amount: 100, type: 'deposit', ...over }) as AccountTransaction
    // 1949103000 = 2031-10-07 01:30 UTC = 2031-10-06 21:30 New York.
    const flows = externalFlows([t({}), t({ type: 'dividend', amount: 5 }), t({ type: 'withdrawal', amount: -40 })])
    expect(flows).toEqual([
      { date: '2031-10-06', accountId: 'UZZ1', amount: 100 },
      { date: '2031-10-06', accountId: 'UZZ1', amount: -40 },
    ])
    expect(nyDateOf(1949103000)).toBe('2031-10-06')
  })
})

describe('returnBasisFromNav', () => {
  it('chains sub-periods and takes a deposit out of the gain', () => {
    const rows = [nav('2031-03-03', 'A', 1000), nav('2031-03-04', 'A', 1110), nav('2031-03-05', 'A', 1221)]
    const out = returnBasisFromNav({
      nav: rows,
      flows: [{ date: '2031-03-04', accountId: 'A', amount: 100 }],
      sinceStr: '2031-03-04',
      untilStr: '2031-03-31',
    })
    expect(out.startDate).toBe('2031-03-03')
    expect(out.startRecorded).toBe(true)
    expect(out.subPeriods).toBe(2)
    // (1110 − 100) / 1000 = 1.01 ; 1221 / 1110 = 1.1
    expect(out.twr).toBeCloseTo(1.01 * 1.1 - 1, 10)
    expect(out.gain).toBe(1221 - 1000 - 100)
    expect(out.flowRows).toBe(1)
    expect(out.dietz).not.toBeNull()
  })

  it('starts from the first stored session when the range starts before the series', () => {
    const out = returnBasisFromNav({
      nav: [nav('2031-03-03', 'A', 1000), nav('2031-03-04', 'A', 1010)],
      flows: [],
      sinceStr: '2031-01-01',
      untilStr: '2031-03-31',
    })
    expect(out.startRecorded).toBe(false)
    expect(out.startDate).toBe('2031-03-03')
    expect(out.twr).toBeCloseTo(0.01, 10)
  })

  it('leaves an account out of a sub-period where it has no close, and counts it', () => {
    const out = returnBasisFromNav({
      nav: [nav('2031-03-03', 'A', 1000), nav('2031-03-04', 'A', 1010), nav('2031-03-04', 'B', 500)],
      flows: [],
      sinceStr: '2031-03-01',
      untilStr: '2031-03-31',
    })
    expect(out.accountsLeftOut).toBe(1)
    expect(out.twr).toBeCloseTo(0.01, 10)
    expect(out.navEnd).toBe(1010)
  })

  it('reads nothing from a single session', () => {
    const out = returnBasisFromNav({ nav: [nav('2031-03-03', 'A', 1000)], flows: [], sinceStr: '2031-03-01', untilStr: '2031-03-31' })
    expect(out.twr).toBeNull()
    expect(out.gain).toBeNull()
    expect(out.navEnd).toBe(1000)
  })
})
