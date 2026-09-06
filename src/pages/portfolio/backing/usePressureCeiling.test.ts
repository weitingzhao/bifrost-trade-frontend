import { describe, it, expect } from 'vitest'
import { parsePressureCeiling, PRESSURE_CEILING_DEFAULT } from './usePressureCeiling'

describe('parsePressureCeiling', () => {
  it('defaults to where the gauge turns heavy and rejects anything outside 10–90%', () => {
    expect(PRESSURE_CEILING_DEFAULT).toBe(0.5)
    expect(parsePressureCeiling('0.6')).toBe(0.6)
    expect(parsePressureCeiling('')).toBeNull()
    expect(parsePressureCeiling('abc')).toBeNull()
    expect(parsePressureCeiling('0.05')).toBeNull()
    expect(parsePressureCeiling('0.95')).toBeNull()
    expect(parsePressureCeiling(null)).toBeNull()
  })
})
