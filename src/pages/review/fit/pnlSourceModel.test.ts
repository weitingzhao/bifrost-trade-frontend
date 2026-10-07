import { describe, expect, it } from 'vitest'
import type { AttributionRow } from '@/lib/schemas/snapshots'
import { contractAttribution, tradeLifeRange } from './pnlSourceModel'

// Invented values.
const row = (over: Partial<AttributionRow> & Record<string, unknown> = {}): AttributionRow =>
  ({
    snapshot_date: '2031-03-04',
    prior_date: '2031-03-03',
    account_id: 'UZZ1',
    contract_key: 'ZZZ|OPT|20310418|50.0|P',
    trade_id: 7,
    symbol: 'ZZZ',
    sec_type: 'OPT',
    expiry: '2031-04-18',
    strike: 50,
    option_right: 'P',
    status: 'ok',
    greeks_quality: 'vendor',
    held_pnl: 10,
    delta_pnl: 6,
    gamma_pnl: -1,
    vega_pnl: 2,
    theta_pnl: 3,
    unexplained: 0,
    ...over,
  }) as AttributionRow

const TRADE = { tradeId: 7, underlying: 'ZZZ', expiry: '2031-04-18', strike: 50, right: 'P', accountId: 'UZZ1' }

describe('contractAttribution', () => {
  it('sums the read rows of this trade on this contract only', () => {
    const out = contractAttribution(
      [
        row(),
        row({ snapshot_date: '2031-03-05', prior_date: '2031-03-04', greeks_quality: 'degraded' }),
        row({ trade_id: 8 }),
        row({ strike: 55 }),
        row({ status: 'closed_in_session', unexplained: null, delta_pnl: null, greeks_quality: null }),
      ],
      TRADE,
    )
    expect(out).not.toBeNull()
    expect(out!.delta).toBe(12)
    expect(out!.sessions).toEqual(['2031-03-04', '2031-03-05'])
    expect(out!.unread).toBe(1)
    expect(out!.degraded).toBe(1)
  })

  it('is null when no row is this contract’s', () => {
    expect(contractAttribution([row({ trade_id: 9 })], TRADE)).toBeNull()
  })
})

describe('tradeLifeRange', () => {
  it('asks for the trade’s life, capped under the API’s range limit', () => {
    expect(tradeLifeRange('2031-03-01', null)).toEqual({ from: '2031-03-01', to: null })
    expect(tradeLifeRange('2025-01-01', '2031-03-04').from).toBe('2029-01-03')
  })
})
