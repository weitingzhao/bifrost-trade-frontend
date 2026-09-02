import type { ObjectiveRun } from '@/api/research/harness'
import { describe, expect, it } from 'vitest'
import {
  funnelReach,
  groupIdenticalRuns,
  parseHarnessTrace,
  traceFunnel,
} from './harnessTrace'

/**
 * `funnelReach` drives a judgement, not just a label: the Harness Console row
 * flags a run as watchlist-sized from its `considered` count. A run that looked
 * at 28 symbols and one that looked at 3,472 both used to render the same tag,
 * and telling them apart meant querying the warehouse.
 */

function trace(funnel: unknown) {
  return { events: [{ step: 'scan_universe', funnel }] }
}

const COMPOSITE = [
  { name: 'sepa', in_count: 3472, out_count: 47 },
  { name: 'momentum', in_count: 47, out_count: 47, optional: true, skipped: true },
  { name: 'option_overlay', in_count: 47, out_count: 8, optional: true },
]

describe('funnelReach', () => {
  it('spans the first step in to the last step out', () => {
    expect(funnelReach(parseHarnessTrace(trace(COMPOSITE)))).toEqual({
      considered: 3472,
      proposed: 8,
    })
  })

  it('separates a real screen from a watchlist re-read', () => {
    const scan = funnelReach(
      parseHarnessTrace(
        trace([
          { name: 'scan_universe', in_count: 26, out_count: 25 },
          { name: 'top_n', in_count: 25, out_count: 3 },
        ]),
      ),
    )
    const composite = funnelReach(parseHarnessTrace(trace(COMPOSITE)))
    expect(scan?.considered).toBe(26)
    expect(composite?.considered).toBe(3472)
    // Same three-ish proposals, two orders of magnitude apart in what was read.
    expect(composite!.considered / scan!.considered).toBeGreaterThan(100)
  })

  it('returns null when a run predates funnel tracing', () => {
    expect(funnelReach(parseHarnessTrace({ events: [{ step: 'scan_universe' }] }))).toBeNull()
    expect(funnelReach(parseHarnessTrace(null))).toBeNull()
  })

  it('returns null rather than a bogus zero when counts are unusable', () => {
    const out = funnelReach(
      parseHarnessTrace(trace([{ name: 'sepa', in_count: 'many', out_count: 8 }])),
    )
    expect(out).toBeNull()
  })

  it('keeps a single-step funnel readable', () => {
    expect(
      funnelReach(parseHarnessTrace(trace([{ name: 'scan_legacy', in_count: 28, out_count: 3 }]))),
    ).toEqual({ considered: 28, proposed: 3 })
  })
})

describe('traceFunnel', () => {
  it('drops entries that are not funnel steps', () => {
    const steps = traceFunnel(
      parseHarnessTrace(trace([{ name: 'sepa', in_count: 1, out_count: 1 }, null, 'oops', {}])),
    )
    expect(steps).toHaveLength(1)
    expect(steps[0].name).toBe('sepa')
  })

  it('is empty when the scan event carries no funnel', () => {
    expect(traceFunnel(parseHarnessTrace({ events: [{ step: 'plan' }] }))).toEqual([])
  })
})

describe('groupIdenticalRuns', () => {
  function run(
    id: string,
    startedAt: string,
    objectiveId: string,
    funnel: { name: string; in_count: number; out_count: number }[],
    status = 'awaiting_approval',
  ): ObjectiveRun {
    return {
      id,
      objective_id: objectiveId,
      started_at: startedAt,
      finished_at: null,
      plan_json: null,
      trace_json: { events: [{ step: 'scan_universe', funnel }] },
      outputs: null,
      status: status as ObjectiveRun['status'],
    }
  }

  const F = [{ name: 'sepa', in_count: 47, out_count: 8 }]

  it('folds a day of re-runs into the newest', () => {
    const groups = groupIdenticalRuns([
      run('r1', '2026-09-01T12:26:00Z', 'obj-a', F),
      run('r2', '2026-09-01T14:41:00Z', 'obj-a', F),
      run('r3', '2026-09-01T15:15:00Z', 'obj-a', F),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].run.id).toBe('r3')
    expect(groups[0].repeats.map((r) => r.id)).toEqual(['r2', 'r1'])
  })

  it('keeps runs that screened different ground apart', () => {
    const groups = groupIdenticalRuns([
      run('r1', '2026-09-01T12:00:00Z', 'obj-a', F),
      run('r2', '2026-09-01T13:00:00Z', 'obj-a', [
        { name: 'sepa', in_count: 3472, out_count: 8 },
      ]),
    ])
    expect(groups).toHaveLength(2)
  })

  it('never folds across days or objectives', () => {
    expect(
      groupIdenticalRuns([
        run('r1', '2026-09-01T12:00:00Z', 'obj-a', F),
        run('r2', '2026-09-02T12:00:00Z', 'obj-a', F),
      ]),
    ).toHaveLength(2)
    expect(
      groupIdenticalRuns([
        run('r1', '2026-09-01T12:00:00Z', 'obj-a', F),
        run('r2', '2026-09-01T13:00:00Z', 'obj-b', F),
      ]),
    ).toHaveLength(2)
  })

  it('never folds a failed run into a successful one', () => {
    expect(
      groupIdenticalRuns([
        run('r1', '2026-09-01T12:00:00Z', 'obj-a', F, 'completed'),
        run('r2', '2026-09-01T13:00:00Z', 'obj-a', F, 'failed'),
      ]),
    ).toHaveLength(2)
  })

  it('leaves a run with no funnel standing alone', () => {
    // Without a funnel there is no way to tell whether two runs did the same
    // work, and folding on a guess would hide a result.
    const bare = { ...run('r1', '2026-09-01T12:00:00Z', 'obj-a', F), trace_json: null }
    const groups = groupIdenticalRuns([bare, { ...bare, id: 'r2' }])
    expect(groups).toHaveLength(2)
  })

  it('returns an empty list for no runs', () => {
    expect(groupIdenticalRuns([])).toEqual([])
  })
})
