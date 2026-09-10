import { describe, it, expect } from 'vitest'
import { finiteValues, linearScale, niceTicks } from './chartScale'

describe('finiteValues', () => {
  it('drops absent readings without turning them into zero', () => {
    expect(finiteValues([1, null, 2, undefined, Number.NaN, Infinity, 3])).toEqual([1, 2, 3])
  })
})

describe('linearScale', () => {
  it('maps the domain across the padded extent', () => {
    const s = linearScale([0, 100], { size: 120, padStart: 10, padEnd: 10 })
    expect(s.at(0)).toBe(10)
    expect(s.at(100)).toBe(110)
    expect(s.at(50)).toBe(60)
  })

  it('inverts for SVG, where y grows downward', () => {
    const s = linearScale([0, 100], { size: 100 })
    expect(s.atInverted(100)).toBe(0)
    expect(s.atInverted(0)).toBe(100)
  })

  it('includes zero only when asked — a price line must not be flattened', () => {
    const bars = linearScale([80, 100], { size: 100, includeZero: true })
    expect(bars.min).toBe(0)
    const line = linearScale([80, 100], { size: 100 })
    expect(line.min).toBe(80)
  })

  it('reports where the baseline sits, and null when zero is off-domain', () => {
    expect(linearScale([-5, 5], { size: 100 }).zero).toBe(50)
    expect(linearScale([80, 100], { size: 100 }).zero).toBeNull()
  })

  it('renders a flat series instead of dividing by zero', () => {
    const s = linearScale([7, 7, 7], { size: 100 })
    expect(s.range).toBeGreaterThan(0)
    expect(Number.isFinite(s.at(7))).toBe(true)
    expect(s.at(7)).toBe(50)
  })

  it('stays total when there is nothing usable', () => {
    const s = linearScale([null, undefined, Number.NaN], { size: 100 })
    expect(Number.isFinite(s.at(0))).toBe(true)
    expect(s.range).toBeGreaterThan(0)
  })

  it('honours an explicit domain so panels can share an axis', () => {
    const s = linearScale([1, 2], { size: 100, domain: [0, 10] })
    expect(s.min).toBe(0)
    expect(s.max).toBe(10)
    expect(s.at(5)).toBe(50)
  })

  it('does not spread a large array into Math.min', () => {
    // Math.min(...arr) throws past the argument limit; an option chain gets there.
    const many = Array.from({ length: 200_000 }, (_, i) => i)
    expect(() => linearScale(many, { size: 100 })).not.toThrow()
    expect(linearScale(many, { size: 100 }).max).toBe(199_999)
  })
})

describe('niceTicks', () => {
  it('lands on round numbers rather than whatever the data reached', () => {
    // The pattern this replaces produced [0.37, 2.19, 4.01].
    expect(niceTicks(0.37, 4.01, 4).every((t) => Number.isInteger(t))).toBe(true)
  })

  it('stays inside the domain', () => {
    for (const [lo, hi] of [[0, 100], [-5, 5], [0.001, 0.009], [12, 4820]] as const) {
      const ts = niceTicks(lo, hi)
      expect(ts.every((t) => t >= lo - 1e-9 && t <= hi + 1e-9)).toBe(true)
    }
  })

  it('gives an exact zero rather than a floating crumb', () => {
    const ts = niceTicks(-10, 10, 5)
    expect(ts).toContain(0)
    expect(ts.some((t) => t !== 0 && Math.abs(t) < 1e-6)).toBe(false)
  })

  it('handles a degenerate or unusable domain', () => {
    expect(niceTicks(5, 5)).toEqual([5])
    expect(niceTicks(Number.NaN, 1)).toEqual([])
    expect(niceTicks(0, 1, 1)).toEqual([])
  })
})
