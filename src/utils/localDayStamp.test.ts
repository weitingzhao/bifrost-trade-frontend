import { describe, it, expect } from 'vitest'
import { localDayStamp } from './positions'

describe('localDayStamp', () => {
  it('formats the local calendar day the way the vendor stamps it', () => {
    expect(localDayStamp(new Date(2026, 8, 5, 23, 30))).toBe('2026-09-05')
    expect(localDayStamp(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01')
  })

  it('uses the local day, not UTC — a late-evening capture is still today', () => {
    // UTC would roll this to the 6th and stamp every leg stale after 7pm.
    const late = new Date(2026, 8, 5, 21, 0)
    expect(localDayStamp(late)).toBe('2026-09-05')
  })
})
