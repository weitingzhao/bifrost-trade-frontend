import { describe, expect, it } from 'vitest'
import { openBreaches } from '@/utils/limitsModel'
import { shellLimitRows } from './useRiskLimitWatch'

/** A funded account comfortably inside its buffer. */
const CLEAR = { buyingPowerBuffer: 0.6, bufferFloor: 0.5, maintenanceOverNlv: 0.2 }

describe('shellLimitRows', () => {
  it('reads exactly one line — and it is the one that blocks an open', () => {
    // The shape of the whole feature: the status bar is entitled to watch what
    // it can read for free, and nothing else. If this count ever grows, either
    // a cheap reading was added on purpose or an expensive one leaked into the
    // shell — and the second would put the model service behind every page.
    const watched = shellLimitRows(CLEAR).filter((r) => r.use != null)
    expect(watched.map((r) => r.key)).toEqual(['bp-buffer'])
    expect(watched[0].kind).toBe('hard')
    expect(watched[0].onBreach).toContain('block opens')
  })

  it('leaves the expensive rules unread rather than reading them as zero', () => {
    // A null reading and a reading of zero are different facts, and the second
    // would fire a concentration alarm on an empty book.
    const rows = shellLimitRows(CLEAR)
    expect(rows.find((r) => r.key === 'single-name')?.current).toBeNull()
    expect(rows.find((r) => r.key === 'backing')?.current).toBeNull()
    expect(openBreaches(rows)).toEqual([])
  })

  it('breaches when the buffer falls under the floor, not when it sits on it', () => {
    expect(openBreaches(shellLimitRows({ ...CLEAR, buyingPowerBuffer: 0.5 }))).toEqual([])
    const under = openBreaches(shellLimitRows({ ...CLEAR, buyingPowerBuffer: 0.41 }))
    expect(under.map((r) => r.key)).toEqual(['bp-buffer'])
    // A floor is breached below the line, so `use` climbs as things get worse.
    expect(under[0].use).toBeGreaterThan(1)
  })

  it('says nothing at all when the broker reported no cushion', () => {
    const rows = shellLimitRows({ ...CLEAR, buyingPowerBuffer: null })
    expect(openBreaches(rows)).toEqual([])
    expect(rows.filter((r) => r.use != null)).toEqual([])
    // The row still names which half is missing — the panel's footnote is the
    // only thing standing between "nothing watched" and "nothing wrong".
    expect(rows.find((r) => r.key === 'bp-buffer')?.noReading).toBeTruthy()
  })
})
