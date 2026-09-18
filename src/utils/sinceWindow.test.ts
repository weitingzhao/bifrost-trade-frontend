import { describe, expect, it } from 'vitest'
import { SINCE_OPTIONS, sinceEpoch } from './sinceWindow'

const NOW = new Date('2026-09-18T14:30:00Z')

describe('sinceEpoch', () => {
  it('is undefined for all of history, so the caller sends no window at all', () => {
    expect(sinceEpoch('', NOW)).toBeUndefined()
  })

  it('lands on UTC midnight, not on the moment it was asked', () => {
    // A window that moved with the clock would answer the same question twice
    // in a day with two different numbers.
    const q = sinceEpoch('q', NOW) as number
    expect(new Date(q * 1000).toISOString()).toBe('2026-06-18T00:00:00.000Z')
  })

  it('walks back the window each option names', () => {
    const iso = (f: Parameters<typeof sinceEpoch>[0]) =>
      new Date((sinceEpoch(f, NOW) as number) * 1000).toISOString().slice(0, 10)
    expect(iso('1m')).toBe('2026-08-18')
    expect(iso('half')).toBe('2026-03-18')
    expect(iso('1y')).toBe('2025-09-18')
    expect(iso('ytd')).toBe('2026-01-01')
  })

  it('offers every option it can resolve', () => {
    for (const { key } of SINCE_OPTIONS) {
      if (key === '') continue
      expect(sinceEpoch(key, NOW)).toBeTypeOf('number')
    }
  })
})
