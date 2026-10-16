/**
 * The Ledger's pending TWS fills (same rule as core 0.61.0 executions_fly). The 2026-10-16 case: a
 * new NVDA option fill on a contract Flex already had was missing, so the Ledger showed net -2
 * while IB had -1. Accounts, symbols and ids are invented.
 */
import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { execOptIdentity, nyTradeDate, optIdentity, pendingTwsFills } from './pendingFills'

const FLEX_KEY = 'ZQ    261120C00245000|OPT|20261120|245.0|C'
const TWS_KEY = 'ZQ  261120C00245000|OPT|20261120|245.0|C'

function row(p: Partial<Execution>): Execution {
  return {
    account_executions_id: 1,
    account_id: 'U0000001',
    symbol: 'ZQ',
    sec_type: 'OPT',
    side: 'BUY',
    quantity: 1,
    price: 1,
    time: null,
    ...p,
  } as Execution
}

const flex = (id: number, exec_id: string, trade_date: string, extra: Partial<Execution> = {}) =>
  row({ account_executions_id: id, exec_id, trade_date, symbol: 'ZQ    261120C00245000', expiry: '20261120',
        strike: 245, option_right: 'C', contract_key: FLEX_KEY, source: 'flex_trades', ...extra })

const tws = (id: number, exec_id: string, isoUtc: string, extra: Partial<Execution> = {}) =>
  row({ account_executions_id: -id, exec_id, time: Date.parse(isoUtc) / 1000, trade_date: null, expiry: '20261120',
        strike: 245, option_right: 'C', contract_key: TWS_KEY, source: 'tws_client', side: 'BOT', ...extra })

const BOOK = [flex(8771, 'a.1', '2026-10-14'), flex(8789, 'a.2', '2026-10-15')]

describe('optIdentity', () => {
  it('reads the root of an OCC local symbol and normalises expiry, strike and right', () => {
    expect(optIdentity('ZQ    261120C00245000', '20261120', 245, 'C')).toBe('ZQ|20261120|245|C')
    expect(optIdentity('zq', '2026-11-20', '245.0', 'CALL')).toBe('ZQ|20261120|245|C')
    expect(optIdentity('ZQ', '20261120', null, 'C')).toBeNull()
  })

  it('is null for a stock', () => {
    expect(execOptIdentity(row({ sec_type: 'STK' }))).toBeNull()
  })
})

describe('nyTradeDate', () => {
  it('is the New York date, not the UTC one', () => {
    expect(nyTradeDate(Date.parse('2026-10-16T02:00:00Z') / 1000)).toBe('2026-10-15')
    expect(nyTradeDate(Date.parse('2026-10-16T16:54:01Z') / 1000)).toBe('2026-10-16')
  })
})

describe('pendingTwsFills', () => {
  it('keeps a new fill on a contract Flex already has, keyed like Flex, marked and dated', () => {
    const [p, ...rest] = pendingTwsFills(BOOK, [tws(6227, 't.new', '2026-10-16T16:54:01Z')])
    expect(rest).toEqual([])
    expect(p.pending).toBe(true)
    expect(p.contract_key).toBe(FLEX_KEY)
    expect(p.trade_date).toBe('2026-10-16')
  })

  it('drops a fill whose exec_id the Flex list already has (imported between the two reads)', () => {
    expect(pendingTwsFills(BOOK, [tws(6219, 'a.2', '2026-10-16T16:00:00Z')])).toEqual([])
  })

  it('drops a fill on or before the last day Flex covers for its account', () => {
    expect(pendingTwsFills(BOOK, [
      tws(1, 'old.1', '2026-10-15T18:00:00Z'),
      tws(2, 'old.2', '2026-03-24T18:00:00Z'),
      tws(3, 'late', '2026-10-16T02:00:00Z'), // 22:00 on 10-15 in New York
    ])).toEqual([])
  })

  it('has no bound for an account Flex has no row for', () => {
    const out = pendingTwsFills(BOOK, [tws(9, 'b.1', '2026-08-28T15:00:00Z', { account_id: 'U0000002' })])
    expect(out.map(e => e.exec_id)).toEqual(['b.1'])
  })

  it('never keeps a BAG or a row without an account', () => {
    expect(pendingTwsFills(BOOK, [
      tws(10, 'bag', '2026-10-16T15:00:00Z', { sec_type: 'BAG' }),
      tws(11, 'noacct', '2026-10-16T15:00:00Z', { account_id: null as unknown as string }),
    ])).toEqual([])
  })

  it('keeps its own key when Flex has no row for the contract', () => {
    const [p] = pendingTwsFills(BOOK, [tws(12, 'n.1', '2026-10-16T15:00:00Z', { strike: 250,
      contract_key: 'ZQ  261120C00250000|OPT|20261120|250.0|C' })])
    expect(p.contract_key).toBe('ZQ  261120C00250000|OPT|20261120|250.0|C')
  })

  it('keeps a pending stock fill', () => {
    const out = pendingTwsFills(BOOK, [tws(13, 's.1', '2026-10-16T15:00:00Z', { sec_type: 'STK', symbol: 'ZS',
      contract_key: 'ZS|STK|||', expiry: null, strike: null, option_right: null })])
    expect(out.map(e => [e.exec_id, e.pending])).toEqual([['s.1', true]])
  })
})
