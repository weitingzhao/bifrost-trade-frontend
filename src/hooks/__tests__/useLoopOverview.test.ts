import { describe, expect, it } from 'vitest'
import { deriveLoopSegments, LOOP_WINDOW_DAYS } from '@/hooks/useLoopOverview'

/**
 * The loop overview exists to show where the circuit is open. Its arithmetic is
 * therefore the part worth guarding: a miscount here understates exactly the gap
 * the view was built to expose.
 */
const NOW = Date.parse('2026-09-04T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

const base = {
  objectiveTitles: ['Daily Loop Stock Explorer'],
  runStartedAt: [] as (string | null | undefined)[],
  pendingBatches: 0,
  approvedBatches: 0,
  tracked: 0,
  settled: 0,
  judged: 0,
  now: NOW,
}
const seg = (input: Partial<typeof base>, id: string) =>
  deriveLoopSegments({ ...base, ...input }, LOOP_WINDOW_DAYS).find((s) => s.id === id)!

describe('deriveLoopSegments', () => {
  it('counts only runs inside the window', () => {
    // Cumulative counts flatter a loop that stopped weeks ago — the reason the
    // window exists at all.
    const s = seg({ runStartedAt: [daysAgo(1), daysAgo(29), daysAgo(31), daysAgo(400)] }, 'screen')
    expect(s.value).toBe(2)
  })

  it('ignores runs with no or unparsable start time rather than counting them', () => {
    const s = seg({ runStartedAt: [null, undefined, 'not-a-date', daysAgo(2)] }, 'screen')
    expect(s.value).toBe(1)
  })

  it('separates what came back scored from what merely came due', () => {
    // settled = the holding period elapsed; judged = it was actually scored.
    // Reporting settled as the result would claim the system learned something
    // from 3 positions when it learned from 1.
    const s = seg({ tracked: 20, settled: 3, judged: 1 }, 'learn')
    expect(s.value).toBe(1)
    expect(s.detail).toContain('20 tracked')
    expect(s.detail).toContain('3 reached their horizon')
  })

  it('flags a segment nothing has reached', () => {
    expect(seg({ tracked: 20, settled: 3, judged: 0 }, 'learn').starved).toBe(true)
    expect(seg({ approvedBatches: 0 }, 'act').starved).toBe(true)
    expect(seg({ objectiveTitles: [] }, 'system').starved).toBe(true)
  })

  it('does not flag a queue for being full — that is its job', () => {
    // "Waiting on you" holding 23 batches is a backlog, not a broken segment;
    // marking it starved would cry wolf on the one place work is expected to sit.
    expect(seg({ pendingBatches: 23 }, 'decide').starved).toBe(false)
  })

  it('says how many proposals were never decided', () => {
    const s = seg({ pendingBatches: 23, approvedBatches: 4 }, 'act')
    expect(s.value).toBe(4)
    expect(s.detail).toBe('23 more never decided')
  })

  it('reads plainly when there is nothing queued', () => {
    expect(seg({ pendingBatches: 0, approvedBatches: 4 }, 'act').detail).toBe('nothing queued')
  })

  it('names the systems rather than counting rows', () => {
    const s = seg({ objectiveTitles: ['Daily Loop', 'Morning IV'] }, 'system')
    expect(s.value).toBe(2)
    expect(s.unit).toBe('systems')
    expect(s.detail).toBe('Daily Loop · Morning IV')
  })

  it('keeps singular units readable', () => {
    expect(seg({ objectiveTitles: ['One'] }, 'system').unit).toBe('system')
    expect(seg({ runStartedAt: [daysAgo(1)] }, 'screen').unit).toBe('run')
  })

  it('always returns the whole circuit, even when every segment is empty', () => {
    // A segment that disappears when it hits zero hides the break instead of
    // showing it.
    const all = deriveLoopSegments({ ...base, objectiveTitles: [] }, LOOP_WINDOW_DAYS)
    expect(all.map((s) => s.id)).toEqual(['system', 'screen', 'decide', 'act', 'learn'])
  })
})
