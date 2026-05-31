import { describe, it, expect } from 'vitest'
import {
  formatInstanceOptExecQtyCell,
  scopedExecListsForPosition,
  instanceGroupKey,
} from './instanceSheetExec'
import { buildLiveOptExecutionMap } from './positionsExecutions'
import type { Execution, InstanceAllGroup, OpenOptionPosition } from '@/types/positions'

function liveOpt(overrides: Partial<OpenOptionPosition> = {}): OpenOptionPosition {
  return {
    kind: 'live',
    contract_key: 'NVDA|OPT|20250620|120|C',
    symbol: 'NVDA',
    right: 'C',
    strike: 120,
    expiry: '20250620',
    qty: 1,
    avg_cost: 5,
    mark_price: null,
    unrealized_pnl: 0,
    pool_label: 'On',
    account_id: 'U001',
    attribution_type: 'single',
    strategy_instance_id: 10,
    ...overrides,
  }
}

const baseGroup: InstanceAllGroup = {
  strategy_instance_id: 10,
  strategy_instance_label: 'Inst #10',
  strategy_opportunity_name: 'Opp',
  strategy_opportunity_id: 1,
  strategy_instance_opened_at_epoch: null,
  options: [liveOpt()],
  stock_coverage: [],
  options_unrealized_pnl: 0,
  structure_type: 'long_call',
  scope_type: 'single_stk',
  risk_profile: null,
}

describe('instanceSheetExec', () => {
  it('instanceGroupKey uses __unassigned__ for null id', () => {
    expect(instanceGroupKey({ strategy_instance_id: null })).toBe('__unassigned__')
    expect(instanceGroupKey({ strategy_instance_id: 5 })).toBe('5')
  })

  it('scopedExecListsForPosition excludes execs for other instances', () => {
    const execs: Execution[] = [
      {
        account_executions_id: 1,
        account_id: 'U001',
        contract_key: 'NVDA|OPT|20250620|120|C',
        symbol: 'NVDA',
        sec_type: 'OPT',
        right: 'C',
        strike: 120,
        expiry: '20250620',
        side: 'Buy',
        qty: 2,
        price: 4,
        time: 1,
        strategy_instance_id: 99,
      },
      {
        account_executions_id: 2,
        account_id: 'U001',
        contract_key: 'NVDA|OPT|20250620|120|C',
        symbol: 'NVDA',
        sec_type: 'OPT',
        right: 'C',
        strike: 120,
        expiry: '20250620',
        side: 'Buy',
        qty: 1,
        price: 4,
        time: 2,
        strategy_instance_id: 10,
      },
    ]
    const finalMap = buildLiveOptExecutionMap(execs)
    const scoped = scopedExecListsForPosition(liveOpt(), baseGroup, finalMap, new Map())
    expect(scoped.final).toHaveLength(1)
    expect(scoped.final[0].account_executions_id).toBe(2)
  })

  it('formatInstanceOptExecQtyCell prefers Final over TWS', () => {
    const pos = liveOpt()
    const finalExec: Execution = {
      account_executions_id: 1,
      account_id: 'U001',
      contract_key: pos.contract_key,
      symbol: 'NVDA',
      sec_type: 'OPT',
      right: 'C',
      strike: 120,
      expiry: '20250620',
      side: 'Buy',
      qty: 3,
      price: 4,
      time: 1,
      strategy_instance_id: 10,
    }
    const twsExec: Execution = {
      ...finalExec,
      account_executions_id: 2,
      qty: 9,
    }
    const cell = formatInstanceOptExecQtyCell(
      baseGroup,
      buildLiveOptExecutionMap([finalExec]),
      buildLiveOptExecutionMap([twsExec]),
    )
    expect(cell).toBe('3')
  })

  it('uses filtered_exec_lists when present', () => {
    const ck = 'NVDA|OPT|20250620|120|C'
    const pos = liveOpt({
      contract_key: ck,
      filtered_exec_lists: {
        final: [
          {
            account_executions_id: 3,
            account_id: 'U001',
            contract_key: ck,
            symbol: 'NVDA',
            sec_type: 'OPT',
            right: 'C',
            strike: 120,
            expiry: '20250620',
            side: 'Buy',
            qty: 7,
            price: 1,
            time: 1,
          },
        ],
        tws: [],
      },
      attribution_type: 'unassigned',
    })
    const scoped = scopedExecListsForPosition(
      pos,
      { strategy_instance_id: null, strategy_opportunity_id: null },
      new Map(),
      new Map(),
    )
    expect(scoped.final[0].qty).toBe(7)
  })
})
