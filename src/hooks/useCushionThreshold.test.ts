import { describe, it, expect } from 'vitest'
import {
  parseCushionPct,
  readForTest,
  setCushionPct,
  subscribeForTest,
  CUSHION_PCT_MAX,
  CUSHION_TIGHT_PCT_DEFAULT,
} from './useCushionThreshold'

describe('parseCushionPct', () => {
  it('accepts a stored fraction', () => {
    expect(parseCushionPct('0.03')).toBe(0.03)
    expect(parseCushionPct('0')).toBe(0)
    expect(parseCushionPct(String(CUSHION_PCT_MAX))).toBe(CUSHION_PCT_MAX)
  })

  it('rejects rather than honours a nonsense stored value', () => {
    // A threshold of 900% would paint every position comfortable — the exact
    // failure this exists to prevent, so it falls back instead.
    expect(parseCushionPct('9')).toBeNull()
    expect(parseCushionPct('-0.1')).toBeNull()
    expect(parseCushionPct('abc')).toBeNull()
    expect(parseCushionPct('')).toBeNull()
    expect(parseCushionPct(null)).toBeNull()
  })
})

describe('the shared store', () => {
  it('is one value across every reader — the bug this replaced', () => {
    // Two components calling the hook used to get two useState copies: the
    // toolbar moved, the column did not.
    const seen: number[] = []
    const unsub = subscribeForTest(() => seen.push(readForTest()))
    setCushionPct(0.05)
    setCushionPct(0.08)
    unsub()
    setCushionPct(0.02)
    expect(seen).toEqual([0.05, 0.08])
    expect(readForTest()).toBe(0.02)
    setCushionPct(CUSHION_TIGHT_PCT_DEFAULT)
  })

  it('clamps rather than accepting an unusable line', () => {
    setCushionPct(99)
    expect(readForTest()).toBe(CUSHION_PCT_MAX)
    setCushionPct(-5)
    expect(readForTest()).toBe(0)
    setCushionPct(CUSHION_TIGHT_PCT_DEFAULT)
  })

  it('ignores a non-finite write instead of poisoning the store', () => {
    setCushionPct(0.04)
    setCushionPct(Number.NaN)
    expect(readForTest()).toBe(0.04)
    setCushionPct(CUSHION_TIGHT_PCT_DEFAULT)
  })
})
