/**
 * The loading group is not a reading (PROD 2026-09-28).
 *
 * A multi-symbol book names an instance only from its own fills, which load
 * five at a time — for tens of seconds most rows have no symbol *yet*. They
 * used to land under "Symbol group: —", which rendered the wait as a reading
 * (36 "no symbol" instances, every one measured as having fills). The group
 * key now separates the three states.
 */
import { describe, expect, it } from 'vitest'
import {
  INSTANCE_GROUP_FAILED,
  INSTANCE_GROUP_LOADING,
  instanceGroupKey,
  instanceSymbol,
} from './useInstanceBook'
import type { InstanceListMetricsEntry } from '@/utils/instanceListMetrics'
import type { StrategyInstance } from '@/types/positions'

type BookOpportunity = Parameters<typeof instanceSymbol>[1][number]

const inst = (id: number) =>
  ({ strategy_instance_id: id, strategy_opportunity_id: 2 }) as unknown as StrategyInstance

const bookOpp = [
  {
    strategy_opportunity_id: 2,
    scope_type: 'explicit_symbols',
    symbols: ['ZZTM', 'QQXX'],
  },
] as unknown as BookOpportunity[]

const ready = (rows: { symbol: string }[]): InstanceListMetricsEntry =>
  ({
    status: 'ready',
    sliced: rows.map((r) => ({ ...r, sec_type: 'OPT', quantity: 1 })),
  }) as unknown as InstanceListMetricsEntry

describe('instanceGroupKey separates loading from the measured —', () => {
  it('metrics landed and an underlying resolves → the symbol', () => {
    const metrics = new Map([[1, ready([{ symbol: 'ZZTM 18SEP26 100 P' }])]])
    expect(instanceGroupKey(inst(1), bookOpp, metrics)).toBe('ZZTM')
  })

  it('metrics landed, nothing resolves, multi-symbol book → the real —', () => {
    const metrics = new Map([[1, ready([])]])
    expect(instanceGroupKey(inst(1), bookOpp, metrics)).toBe('—')
  })

  it('metrics not landed yet → the loading sentinel, never —', () => {
    const metrics = new Map<number, InstanceListMetricsEntry>()
    expect(instanceGroupKey(inst(1), bookOpp, metrics)).toBe(INSTANCE_GROUP_LOADING)
  })
})

describe('a failed read is named, never parked in loading', () => {
  it('status error → the failed sentinel', () => {
    const metrics = new Map([[1, { status: 'error' } as unknown as InstanceListMetricsEntry]])
    expect(instanceGroupKey(inst(1), bookOpp, metrics)).toBe(INSTANCE_GROUP_FAILED)
  })
})
