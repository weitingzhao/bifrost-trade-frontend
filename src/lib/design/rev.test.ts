import { describe, expect, it } from 'vitest'
import { parseRev, revIsNewer } from './rev'

describe('parseRev', () => {
  it('reads date and ordinal', () => {
    expect(parseRev('2026-09-15.13')).toEqual([2026, 9, 15, 13])
  })

  it('treats a missing ordinal as zero', () => {
    expect(parseRev('2026-09-15')).toEqual([2026, 9, 15, 0])
  })

  it('refuses anything that is not a rev', () => {
    expect(parseRev('')).toBeNull()
    expect(parseRev(null)).toBeNull()
    expect(parseRev('unknown')).toBeNull()
    expect(parseRev('2026-9-15.1')).toBeNull()
  })
})

describe('revIsNewer', () => {
  it('compares the ordinal as a number, not as text', () => {
    // The bug this function exists to avoid: '.10' sorts before '.9' as a string.
    expect(revIsNewer('2026-09-15.10', '2026-09-15.9')).toBe(true)
    expect(revIsNewer('2026-09-15.9', '2026-09-15.10')).toBe(false)
  })

  it('compares the date first', () => {
    expect(revIsNewer('2026-09-16.1', '2026-09-15.13')).toBe(true)
    expect(revIsNewer('2026-09-14.13', '2026-09-15.1')).toBe(false)
  })

  it('is false when the revs are equal', () => {
    expect(revIsNewer('2026-09-15.5', '2026-09-15.5')).toBe(false)
  })

  it('is false when either side cannot be read', () => {
    // An unreadable rev is not evidence that the design moved, so a walked page
    // stays walked rather than sending the Owner back to a page nothing changed on.
    expect(revIsNewer('unknown', '2026-09-15.5')).toBe(false)
    expect(revIsNewer('2026-09-15.6', undefined)).toBe(false)
  })
})
