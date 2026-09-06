import { describe, it, expect } from 'vitest'
import { parsePressureCeiling, riskLevelFor, PRESSURE_CEILING_DEFAULT, RISK_LEVELS } from './usePressureCeiling'

describe('pressure ceiling', () => {
  it('offers three named levels, balanced on the gauge’s own heavy line', () => {
    expect(RISK_LEVELS.map((l) => [l.id, l.pct])).toEqual([
      ['cautious', 0.35],
      ['balanced', 0.5],
      ['bold', 0.65],
    ])
    expect(PRESSURE_CEILING_DEFAULT).toBe(0.5)
    expect(RISK_LEVELS.every((l) => l.meaning.length > 20)).toBe(true)
  })

  it('reads a stored percentage back as the level nearest it', () => {
    expect(riskLevelFor(0.5).id).toBe('balanced')
    expect(riskLevelFor(0.34).id).toBe('cautious')
    expect(riskLevelFor(0.6).id).toBe('bold')
    // A value from before the levels existed still lands somewhere sensible.
    expect(riskLevelFor(0.9).id).toBe('bold')
    expect(riskLevelFor(0.1).id).toBe('cautious')
  })

  it('rejects a stored value outside the levels’ range', () => {
    expect(parsePressureCeiling('0.5')).toBe(0.5)
    expect(parsePressureCeiling('')).toBeNull()
    expect(parsePressureCeiling('abc')).toBeNull()
    expect(parsePressureCeiling('0.05')).toBeNull()
    expect(parsePressureCeiling('0.95')).toBeNull()
    expect(parsePressureCeiling(null)).toBeNull()
  })
})
