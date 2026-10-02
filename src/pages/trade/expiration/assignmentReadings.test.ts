import { describe, expect, it } from 'vitest'
import type { CorporateActionRow } from '@/api/marketData/corporateActions'
import type { Execution } from '@/types/positions'
import { bookedHistory, earlyTrigger, isoDay } from './assignmentReadings'

// Invented fixtures — no book data.
const div = (ex: string, amount: number | null): CorporateActionRow => ({
  symbol: 'XYZ',
  action_type: 'dividend',
  ex_date: ex,
  record_date: null,
  payment_date: null,
  ratio_from: null,
  ratio_to: null,
  amount,
  currency: 'USD',
})

const call = { right: 'C' as const, expiry: '20261120', extrinsic: 0.4 }
const TODAY = '2026-09-26'

describe('earlyTrigger', () => {
  it('reads a put as having no dividend trigger', () => {
    expect(earlyTrigger({ ...call, right: 'P' }, [div('2026-10-10', 1)], TODAY).text).toMatch(/no dividend trigger/)
  })

  it('keeps loading and a failed read apart from a clean answer', () => {
    expect(earlyTrigger(call, undefined, TODAY).text).toMatch(/reading/)
    const failed = earlyTrigger(call, null, TODAY)
    expect(failed.text).toMatch(/unread/)
    expect(failed.tone).toBe('warn')
  })

  it('says none is declared when nothing sits between today and expiry', () => {
    const r = earlyTrigger(call, [div('2026-08-01', 0.5), div('2026-12-15', 0.5)], TODAY)
    expect(r.text).toBe('none declared before expiry')
    expect(r.exDate).toBeNull()
  })

  it('flags a declared dividend that outweighs the time value', () => {
    const r = earlyTrigger(call, [div('2026-10-10', 0.55)], TODAY)
    expect(r.hot).toBe(true)
    expect(r.exDate).toBe('2026-10-10')
  })

  it('reads a declared dividend the time value still covers as amber but not hot', () => {
    const r = earlyTrigger(call, [div('2026-10-10', 0.25)], TODAY)
    expect(r.hot).toBe(false)
    expect(r.tone).toBe('warn')
    expect(r.text).toMatch(/holds by 0\.15/)
  })
})

describe('bookedHistory', () => {
  const row = (over: Partial<Execution>): Execution =>
    ({
      account_executions_id: null,
      account_id: 'A',
      contract_key: '',
      symbol: 'XYZ',
      sec_type: 'OPT',
      side: 'Buy',
      qty: 1,
      price: 0,
      time: null,
      transaction_type: 'BookTrade',
      ...over,
    }) as Execution

  it('pairs an option book entry with a same-day stock leg as an assignment', () => {
    const h = bookedHistory([
      row({ symbol: 'XYZ   261016C00050000', trade_date: '2026-10-16', expiry: '20261016', side: 'Buy', quantity: 2, option_right: 'C' }),
      row({ symbol: 'XYZ', sec_type: 'STK', trade_date: '2026-10-16', side: 'Sell', quantity: 200 }),
      row({ symbol: 'ABC   261016P00020000', trade_date: '2026-10-16', expiry: '20261016', side: 'Buy', quantity: 1 }),
      row({ symbol: 'ABC', sec_type: 'STK', transaction_type: 'ExchTrade', trade_date: '2026-10-16' }),
    ])
    expect(h.optionLegs).toBe(2)
    expect(h.expired).toBe(1)
    expect(h.events).toHaveLength(1)
    expect(h.events[0]).toMatchObject({ underlying: 'XYZ', kind: 'assigned', shares: -200, early: false })
  })

  it('marks a stock leg booked before the option’s expiry as early', () => {
    const h = bookedHistory([
      row({ symbol: 'XYZ   261016C00050000', trade_date: '2026-10-01', expiry: '20261016', side: 'Buy' }),
      row({ symbol: 'XYZ', sec_type: 'STK', trade_date: '2026-10-01', side: 'Sell', quantity: 100 }),
    ])
    expect(h.events[0].early).toBe(true)
  })

  it('normalises an expiry to ISO', () => {
    expect(isoDay('20261120')).toBe('2026-11-20')
    expect(isoDay('')).toBe('')
  })
})
