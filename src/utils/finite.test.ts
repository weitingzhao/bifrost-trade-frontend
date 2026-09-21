import { describe, expect, it } from 'vitest'
import { finiteOrNull, numericOrNull } from './finite'

describe('finiteOrNull', () => {
  it('takes a finite number and nothing else', () => {
    expect(finiteOrNull(1.5)).toBe(1.5)
    expect(finiteOrNull(0)).toBe(0)
    expect(finiteOrNull(NaN)).toBeNull()
    expect(finiteOrNull(Infinity)).toBeNull()
  })

  it('refuses to coerce — a string is not a number here', () => {
    expect(finiteOrNull('81.6')).toBeNull()
  })

  it('answers null for the shapes JSON actually sends', () => {
    expect(finiteOrNull(null)).toBeNull()
    expect(finiteOrNull(undefined)).toBeNull()
    expect(finiteOrNull({})).toBeNull()
  })
})

describe('numericOrNull', () => {
  it('reads a Postgres numeric off the wire', () => {
    // `/research/candidate-outcome/rows` sends every price and return this way.
    expect(numericOrNull('146.73')).toBe(146.73)
    expect(numericOrNull('-0.02235398350712192')).toBeCloseTo(-0.0223539835, 10)
  })

  it('still takes a real number', () => {
    expect(numericOrNull(2)).toBe(2)
    expect(numericOrNull(NaN)).toBeNull()
  })

  it('answers null for a blank string rather than zero', () => {
    // `Number('')` is 0, so a reader written as `v == null ? null : Number(v)`
    // turns a missing field into a plotted zero. An empty string is an absent
    // reading.
    expect(numericOrNull('')).toBeNull()
    expect(numericOrNull('   ')).toBeNull()
  })

  it('answers null for anything that is not a number afterwards', () => {
    expect(numericOrNull('n/a')).toBeNull()
    expect(numericOrNull(null)).toBeNull()
    expect(numericOrNull(undefined)).toBeNull()
    expect(numericOrNull([])).toBeNull()
  })
})
