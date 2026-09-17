import { describe, expect, it } from 'vitest'
import { buildBrokerRows, unrealizedPnlTotal } from './accountsBrokerRows'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { ExecutionFreshnessItem } from '@/types/trading'

// Three accounts shaped the way DEV reports them, figures invented: the third
// reports zero balances with a fuller field set than the other two, and holds nothing.
const ACCOUNTS: IbAccountSnapshot[] = [
  {
    account_id: 'U17123565',
    summary: {
      NetLiquidation: '600000.00',
      TotalCashValue: '20000.00',
      BuyingPower: '1800000.00',
      MaintMarginReq: '180000.00',
      ExcessLiquidity: '420000.00',
      Cushion: '0.700000',
    },
    positions: Array.from({ length: 23 }, () => ({ symbol: 'X', unrealized_pnl: 100 })),
  },
  {
    account_id: 'U8829175',
    summary: {
      NetLiquidation: '400000.00',
      TotalCashValue: '5000.00',
      BuyingPower: '1200000.00',
      MaintMarginReq: '100000.00',
      ExcessLiquidity: '300000.00',
      Cushion: '0.750000',
    },
    positions: Array.from({ length: 5 }, () => ({ symbol: 'Y', unrealized_pnl: 50 })),
  },
  {
    account_id: 'U17113214',
    summary: {
      NetLiquidation: '0.0',
      TotalCashValue: '0.0',
      BuyingPower: '0.0',
      MaintMarginReq: '0.00',
      ExcessLiquidity: '0.00',
      Cushion: '1',
      DayTradesRemaining: '3',
    },
    positions: [],
  },
]

const FRESHNESS: ExecutionFreshnessItem[] = [
  { account_id: 'U17123565', source: 'flex_trades', latest_exec_ts: 1789472528, days_since_latest: 1.571 },
  { account_id: 'U17123565', source: 'tws_client', latest_exec_ts: 1778911822, days_since_latest: 123.8 },
  { account_id: 'U8829175', source: 'flex_trades', latest_exec_ts: 1787834803, days_since_latest: 20.53 },
  { account_id: 'U8829175', source: 'tws_client', latest_exec_ts: 1776131006, days_since_latest: 155.99 },
]

describe('the by-account table', () => {
  it('carries the six fields the per-account card used to hold, per account', () => {
    const { rows } = buildBrokerRows(ACCOUNTS, FRESHNESS)
    const host = rows[0]
    expect(host.netLiq).toBeCloseTo(600000.00)
    expect(host.cash).toBeCloseTo(20000.00)
    expect(host.buyingPower).toBeCloseTo(1800000.00)
    expect(host.maintenance).toBeCloseTo(180000.00)
    expect(host.excessLiquidity).toBeCloseTo(420000.00)
    expect(host.cushion).toBeCloseTo(0.700000)
    expect(host.positions).toBe(23)
    expect(host.shareOfTotal).toBeCloseTo(60, 1)
  })

  it('reports the two rec ages per account, which a single badge cannot', () => {
    const { rows } = buildBrokerRows(ACCOUNTS, FRESHNESS)
    expect(rows[0].flexRecDays).toBeCloseTo(1.571)
    expect(rows[1].flexRecDays).toBeCloseTo(20.53)
    // 19 days apart. One number over the book would have shown the fresher one.
  })

  // Owner's ruling: standing idle, and not to be started. It is always on the
  // table, it raises no freshness alarm, and its two rec columns have no reading
  // rather than a zero.
  it('keeps the dormant account on the table, with no reading where it has none', () => {
    const { rows } = buildBrokerRows(ACCOUNTS, FRESHNESS)
    const dormant = rows[2]
    expect(dormant.dormant).toBe(true)
    expect(dormant.role).toBe('dormant')
    expect(dormant.roleNote).toBe('not in use')
    // The broker sends Cushion `1` with no net liquidation behind it.
    expect(dormant.cushion).toBeNull()
    expect(dormant.flexRecDays).toBeNull()
    expect(dormant.twsRecDays).toBeNull()
    expect(dormant.positions).toBe(0)
  })

  it('does not call three day-trades remaining a warning', () => {
    const { rows } = buildBrokerRows(ACCOUNTS, FRESHNESS)
    // Ruling F7: the counter appears at two or fewer. Only the idle account
    // reports the field at all, and it reports three.
    expect(rows[2].dayTradesLeft).toBeNull()

    const nearLimit = buildBrokerRows(
      [{ ...ACCOUNTS[2], summary: { ...ACCOUNTS[2].summary, DayTradesRemaining: '1' } }],
      FRESHNESS,
    )
    expect(nearLimit.rows[0].dayTradesLeft).toBe(1)
  })

  it('totals the columns the broker gives and nothing it does not', () => {
    const { totals } = buildBrokerRows(ACCOUNTS, FRESHNESS)
    expect(totals.netLiq).toBeCloseTo(1000000.00)
    expect(totals.positions).toBe(28)
    expect(totals.maintenance).toBeCloseTo(280000.00)
  })
})

describe('unrealizedPnlTotal', () => {
  it('sums what the broker reported per line', () => {
    expect(unrealizedPnlTotal(ACCOUNTS)).toBe(23 * 100 + 5 * 50)
  })
})
