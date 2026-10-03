import { describe, it, expect } from 'vitest'
import { buildTradeGroups } from './buildTradeGroups'
import type { PositionTradeAttribution } from '@/types/positions'

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
})
