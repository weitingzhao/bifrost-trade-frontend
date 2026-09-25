import { describe, expect, it } from 'vitest'
import type { AutopilotObjective } from '@/api/research/harness'
import { handProgress, loopProgress, waitingStep } from './objectiveProgress'

const OBJ = {
  id: 'obj-x',
  title: 'Invented loop',
  status: 'active',
  schedule: 'daily_open',
  hunts: '',
  last_run: { id: 'run-1', started_at: '2031-03-11T13:30:04+00:00', finished_at: null, status: 'awaiting_approval' },
  last_memo: {
    run_id: 'run-1',
    started_at: null,
    status: null,
    headline: '',
    best_conviction: 3,
    actionable: 0,
    split: 0,
    blocked: 0,
    picks: [
      { symbol: 'ZZA', action: 'watch', conviction: 2, grade: 'A' },
      { symbol: 'ZZB', action: 'avoid', conviction: 1, grade: 'A' },
    ],
    considered: null,
  },
  track_record: { status: 'ok', scope: 'objective', horizon_days: 5, hit_rate: 0.35, judged: 48, avg_excess: 0 },
  spend_30d_usd: 0,
  pending_memos: 12,
  runs: 3,
} as AutopilotObjective

describe('loopProgress', () => {
  it('reads each assisted stage from the standing, and names the stages nothing links', () => {
    const steps = loopProgress('assisted', OBJ)
    expect(steps.map((s) => s.stage)).toEqual(['Run', 'Proposed', 'Waiting you', 'Ordered', 'Open', 'Settled'])
    expect(steps[1]).toMatchObject({ v: '2', lamp: 'green' })
    expect(steps[2]).toMatchObject({ v: '12', lamp: 'yellow', hot: true })
    // Unlinked is not "nothing yet": it says why.
    expect(steps[3]).toMatchObject({ v: '—', note: expect.stringContaining('carries its objective') })
    expect(steps[5]).toMatchObject({ v: '48 · 35%', lamp: 'green' })
    expect(waitingStep(steps)?.stage).toBe('Waiting you')
  })

  it('draws auto as the leash accepting and only the order waiting', () => {
    expect(loopProgress('auto', OBJ).map((s) => s.stage)).toEqual(['Run', 'Accepted', 'Order approval', 'Ordered', 'Settled'])
  })

  it('reads an objective that never ran as gray, never as a tick', () => {
    const steps = loopProgress('assisted', null)
    expect(steps.every((s) => s.lamp === 'gray')).toBe(true)
    expect(waitingStep(steps)).toBeNull()
  })
})

describe('handProgress', () => {
  it('follows its subject, and a draft plan is the step that waits', () => {
    const steps = handProgress('ZZA', { open: 2, draft: 1, filled: 0 })
    expect(steps.map((s) => s.stage)).toEqual(['Analyze', 'Plan', 'Order', 'Position', 'Settle'])
    expect(steps[0]).toMatchObject({ v: 'ZZA', lamp: 'green' })
    expect(steps[1]).toMatchObject({ v: '1 draft', hot: true })
  })

  it('says a stage it does not read is not read, not empty', () => {
    const steps = handProgress('ZZA', { open: 0, draft: 0, filled: 0 })
    expect(steps[3].note).toMatch(/not read in this menu/)
    expect(handProgress(null, null)[0]).toMatchObject({ v: '—', lamp: 'gray' })
  })
})
