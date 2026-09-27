import { describe, expect, it } from 'vitest'
import { DIM_TYPES, dimCatalogType } from '@/utils/gateDefaults'

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
