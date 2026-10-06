import { describe, it, expect } from 'vitest'
import { buildTradeGroups, eodMarkLabel } from './buildTradeGroups'
import type { LivePositionRow, PositionTradeAttribution } from '@/types/positions'

describe('buildTradeGroups', () => {
  const attrRow = (overrides: Partial<PositionTradeAttribution>): PositionTradeAttribution => ({
    account_id: 'U001',
    contract_key: 'NVDA|OPT|20250620|120|P',
    symbol: 'NVDA',
    sec_type: 'OPT',
    expiry: '20250620',
    strike: 120,
    option_right: 'P',
    position_qty: 1,
    avg_cost: 5,
    price_mid: 6,
    price_last: 6,
    trade_id: 62,
    trade_label: 'Strategy #62',
    strategy_opportunity_id: 1,
    strategy_opportunity_name: 'NVDA Cash Secured Put',
    trade_opened_at_epoch: 1700000000,
    structure_type: 'cash_secured_put',
    scope_type: 'watchlist_stk',
    strategy_structure_id: 10,
    open_qty_est: 2,
    attribution_ratio: 1,
    unrealized_pnl_est: 100,
    source_exec_count: 1,
    is_mixed: false,
    has_unassigned: false,
    ...overrides,
  })

  it('builds one group per attributed instance from API rows', () => {
    const groups = buildTradeGroups({
      attributions: [attrRow({}), attrRow({ trade_id: 63, trade_label: 'Strategy #63' })],
      liveOptions: [],
      accountFilter: { host: true, secondary: true },
      hostAccountId: '',
      secondaryAccountId: '',
      filterSymbol: '',
      filterExpiry: '',
      showOffTrack: false,
      executionsFinal: [],
    })
    expect(groups).toHaveLength(2)
    expect(groups.every((g) => g.trade_id != null)).toBe(true)
    expect(groups[0].positions[0].qty).toBe(2)
  })

  it('filters by exact symbol like Legacy', () => {
    const groups = buildTradeGroups({
      attributions: [attrRow({}), attrRow({ symbol: 'AAPL', trade_id: 99 })],
      liveOptions: [],
      accountFilter: { host: true, secondary: true },
      hostAccountId: '',
      secondaryAccountId: '',
      filterSymbol: 'NVDA',
      filterExpiry: '',
      showOffTrack: false,
      executionsFinal: [],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].trade_id).toBe(62)
  })
  // TD-171: from core 0.51.0 price_last may be the vendor's dated close, not a live quote.
  const onlyLeg = (row: PositionTradeAttribution) =>
    buildTradeGroups({
      attributions: [row],
      liveOptions: [],
      accountFilter: { host: true, secondary: true },
      hostAccountId: '',
      secondaryAccountId: '',
      filterSymbol: '',
      filterExpiry: '',
      showOffTrack: false,
      executionsFinal: [],
    })[0].positions[0]

  it('labels a vendor_eod mark EOD with its date (TD-171)', () => {
    const leg = onlyLeg(
      attrRow({ price_mid: null, price_last: 4.2, mark_source: 'vendor_eod', mark_date: '2031-10-03' }),
    )
    expect(leg.mark_price).toBe(4.2)
    expect(leg.mark_source).toBe('vendor_eod')
    expect(leg.mark_date).toBe('2031-10-03')
    expect(eodMarkLabel(leg)).toBe('EOD 10-03')
  })

  it('does not label a quote_live mark (TD-171)', () => {
    const leg = onlyLeg(
      attrRow({ price_mid: 6.1, price_last: 6.2, mark_source: 'quote_live', mark_date: '2031-10-06' }),
    )
    expect(leg.mark_price).toBe(6.1)
    expect(leg.mark_source).toBe('quote_live')
    expect(eodMarkLabel(leg)).toBeNull()
  })

  it('leaves a row from an API before core 0.51.0 unlabelled (TD-171)', () => {
    const leg = onlyLeg(attrRow({ price_mid: null, price_last: 4.2 }))
    expect(leg.mark_price).toBe(4.2)
    expect('mark_source' in leg).toBe(false)
    expect(eodMarkLabel(leg)).toBeNull()
  })

  it('does not carry the row label when IB prices the leg (TD-171)', () => {
    const groups = buildTradeGroups({
      attributions: [attrRow({ price_mid: null, price_last: 4.2, mark_source: 'vendor_eod', mark_date: '2031-10-03' })],
      liveOptions: [{ account_id: 'U001', contract_key: 'NVDA|OPT|20250620|120|P', price: 5.5 } as LivePositionRow],
      accountFilter: { host: true, secondary: true },
      hostAccountId: '',
      secondaryAccountId: '',
      filterSymbol: '',
      filterExpiry: '',
      showOffTrack: false,
      executionsFinal: [],
    })
    const leg = groups[0].positions[0]
    expect(leg.mark_price).toBe(5.5)
    expect(eodMarkLabel(leg)).toBeNull()
  })
})
