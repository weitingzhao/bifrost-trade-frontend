import { describe, expect, it } from 'vitest'
import { nextRun } from './objectiveSchedule'

/** A Wednesday, 11:20 UTC. */
const WED = Date.parse('2026-09-23T11:20:00Z')
/** A Friday, 15:00 UTC — after the open slot has passed. */
const FRI_PM = Date.parse('2026-09-25T15:00:00Z')

describe('nextRun', () => {
  it('counts down to the open slot’s stated time', () => {
    expect(nextRun('daily_open', 'active', WED)).toEqual({ at: '13:30Z', sub: 'in 2h 10m' })
  })

  it('skips the weekend, because the slot says weekdays', () => {
    // Friday after 13:30 → Monday, not Saturday.
    expect(nextRun('daily_open', 'active', FRI_PM).sub).toBe('in 2d 22h')
  })

  it('says why there is no time rather than inventing one', () => {
    // These slots name a cadence and no clock, and a made-up minute on a page
    // about when a machine acts would be worse than a dash.
    expect(nextRun('daily_eod', 'active', WED)).toEqual({ at: '—', sub: 'daily_eod · no stated time' })
    expect(nextRun('weekly', 'active', WED)).toEqual({ at: '—', sub: 'weekly · no stated time' })
    expect(nextRun('adhoc', 'active', WED)).toEqual({ at: '—', sub: 'Run now only' })
  })

  it('an archived objective has no next run at all', () => {
    expect(nextRun('daily_open', 'archived', WED)).toEqual({ at: '—', sub: 'archived' })
  })

  it('names a slot it does not know instead of falling back to one it does', () => {
    expect(nextRun('hourly', 'active', WED).sub).toContain('unknown schedule')
  })
})
