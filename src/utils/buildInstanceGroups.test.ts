import { describe, it, expect } from 'vitest'
import { buildInstanceGroups } from './buildInstanceGroups'
import type { PositionInstanceAttribution } from '@/types/positions'

describe('buildInstanceGroups', () => {
  const attrRow = (overrides: Partial<PositionInstanceAttribution>): PositionInstanceAttribution => ({
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
    strategy_instance_id: 62,
    strategy_instance_label: 'Strategy #62',
    strategy_opportunity_id: 1,
    strategy_opportunity_name: 'NVDA Cash Secured Put',
    strategy_instance_opened_at_epoch: 1700000000,
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
    const groups = buildInstanceGroups({
      attributions: [attrRow({}), attrRow({ strategy_instance_id: 63, strategy_instance_label: 'Strategy #63' })],
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
    expect(groups.every((g) => g.strategy_instance_id != null)).toBe(true)
    expect(groups[0].positions[0].qty).toBe(2)
  })

  it('filters by exact symbol like Legacy', () => {
    const groups = buildInstanceGroups({
      attributions: [attrRow({}), attrRow({ symbol: 'AAPL', strategy_instance_id: 99 })],
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
    expect(groups[0].strategy_instance_id).toBe(62)
  })
})
