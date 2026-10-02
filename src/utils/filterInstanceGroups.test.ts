import { describe, it, expect } from 'vitest'
import { filterInstanceGroups } from './filterInstanceGroups'
import type { InstanceAllGroup } from '@/types/positions'

function group(
  overrides: Partial<InstanceAllGroup> & { options: InstanceAllGroup['options'] },
): InstanceAllGroup {
  return {
    strategy_instance_id: 1,
    strategy_instance_label: null,
    strategy_opportunity_name: null,
    strategy_opportunity_id: null,
    strategy_instance_opened_at_epoch: null,
    stock_coverage: [],
    options_unrealized_pnl: 0,
    template_code: null,
    template_label: null,
    structure_name: null,
    scope_type: null,
    risk_profile: null,
    ...overrides,
  }
}

describe('filterInstanceGroups', () => {
  const base = group({
    options: [
      {
        kind: 'live',
        contract_key: 'A',
        symbol: 'NVDA',
        strike: 1,
        expiry: '20250101',
        right: 'C',
        qty: 1,
        avg_cost: 1,
        mark_price: null,
        unrealized_pnl: 0,
        pool_label: 'On',
        account_id: 'U1',
        attribution_type: 'single',
      },
    ],
  })

  it('filters unassigned by null strategy_instance_id', () => {
    const assigned = base
    const unassigned = group({
      strategy_instance_id: null,
      options: [{ ...base.options[0], attribution_type: 'unassigned' }],
    })
    const out = filterInstanceGroups({
      groups: [assigned, unassigned],
      filterSymbol: '',
      filters: {
        structureType: 'all',
        oppName: 'all',
        scopeType: 'all',
        attributionType: 'unassigned',
      },
    })
    expect(out).toHaveLength(1)
    expect(out[0].strategy_instance_id).toBeNull()
  })

  it('single filter excludes groups that also have mixed', () => {
    const mixedGroup = group({
      options: [
        { ...base.options[0], attribution_type: 'single' },
        { ...base.options[0], contract_key: 'B', attribution_type: 'mixed' },
      ],
    })
    const out = filterInstanceGroups({
      groups: [mixedGroup, base],
      filterSymbol: '',
      filters: {
        structureType: 'all',
        oppName: 'all',
        scopeType: 'all',
        attributionType: 'single',
      },
    })
    expect(out).toHaveLength(1)
    expect(out[0]).toBe(base)
  })

  it('the structure filter matches the template code, not a structure name (TD-41)', () => {
    const condor = group({ options: [], strategy_instance_id: 2, template_code: 'iron_condor', structure_name: 'Iron Condor weekly' })
    const call = group({ options: [], strategy_instance_id: 3, template_code: 'covered_call_otm', structure_name: 'Covered Call 10% OTM' })
    const run = (structureType: string) =>
      filterInstanceGroups({
        groups: [condor, call],
        filterSymbol: '',
        filters: { structureType, oppName: 'all', scopeType: 'all', attributionType: 'all' },
      })
    expect(run('iron_condor').map((g) => g.strategy_instance_id)).toEqual([2])
    expect(run('Iron Condor weekly')).toEqual([])
  })
})

