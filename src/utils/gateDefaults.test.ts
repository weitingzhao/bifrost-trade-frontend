import { describe, expect, it } from 'vitest'
import { DIM_TYPES, dimCatalogType, dimOptions } from '@/utils/gateDefaults'

describe('dimCatalogType', () => {
  it('reads each gate dim field under the key GET /strategies/dims groups it by', () => {
    // by_type is keyed by the bare dim type; the gate payload keeps the dim_ field names.
    expect(DIM_TYPES.map(dimCatalogType)).toEqual([
      'direction',
      'structure',
      'coverage',
      'risk',
      'volatility',
      'time',
    ])
  })
})

describe('dimOptions', () => {
  const row = (code: string) => ({ strategy_dim_id: 1, dim_type: 'direction', code, display_label: code, sort_order: 1 })

  it('reads by_column under the field name (api 0.6.7)', () => {
    const dims = { by_type: { direction: [row('old')] }, by_column: { dim_direction: [row('bull')] } }
    expect(dimOptions(dims, 'dim_direction').map((r) => r.code)).toEqual(['bull'])
  })

  it('falls back to by_type under the bare type for an older API', () => {
    expect(dimOptions({ by_type: { direction: [row('bull')] } }, 'dim_direction').map((r) => r.code)).toEqual(['bull'])
    expect(dimOptions(undefined, 'dim_time')).toEqual([])
  })
})
