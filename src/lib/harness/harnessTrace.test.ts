import type { ObjectiveRun } from '@/api/research/harness'
import { describe, expect, it } from 'vitest'
import {
  funnelReach,
  groupIdenticalRuns,
  parseHarnessTrace,
  stageDurationsMs,
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
      source: 'funnel_tail',
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

  /**
   * The failure this guards against: a run whose funnel ends at a pass-through
   * layer. `option_overlay` and `discovery_assist` take the selection layers'
   * output and hand it straight on, so the last step's out_count stopped being
   * the number of proposals the moment they were added — the drawer header and
   * the Console FUNNEL column both reported 24 for a run that proposed 8.
   */
  it('reports what the run said it proposed, not what the funnel trails off at', () => {
    const out = funnelReach(
      parseHarnessTrace({
        events: [
          { step: 'scan_universe', funnel: COMPOSITE },
          { step: 'propose_candidates', count: 3 },
        ],
      }),
    )
    expect(out).toEqual({ considered: 3472, proposed: 3, source: 'event' })
  })

  it('falls back to the funnel tail for runs recorded before that event, and says so', () => {
    const out = funnelReach(parseHarnessTrace(trace(COMPOSITE)))
    expect(out?.source).toBe('funnel_tail')
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
    ).toEqual({ considered: 28, proposed: 3, source: 'funnel_tail' })
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

/**
 * A finished run reported "5.1s" and six green ticks — the same picture whether
 * the time went to the universe scan or the personas. Stage timing is what makes
 * an already-complete run legible as a process.
 */
describe('stageDurationsMs', () => {
  const stamped = (rows: [string, number][]) =>
    parseHarnessTrace({ events: rows.map(([step, at_ms]) => ({ step, at_ms })) })

  it('charges a stage the gap since the previous stage, not the previous event', () => {
    // propose_candidates is preceded by one propose_candidate per symbol; timing
    // against the last of those would credit Propose with 5ms of its 400.
    const d = stageDurationsMs(
      stamped([
        ['plan', 20],
        ['plan_ops', 22],
        ['scan_universe', 3120],
        ['propose_candidate', 3500],
        ['propose_candidate', 3515],
        ['propose_candidates', 3520],
      ]),
    )
    expect(d.get('plan')).toBe(20)
    expect(d.get('scan_universe')).toBe(3100)
    expect(d.get('propose_candidates')).toBe(400)
  })

  it('ignores events that are not pipeline stages', () => {
    const d = stageDurationsMs(stamped([['resolved_source', 10], ['plan', 20]]))
    expect(d.has('resolved_source')).toBe(false)
    expect(d.get('plan')).toBe(20)
  })

  it('is empty — not zeroes — for a run recorded before stage timing', () => {
    // "not measured" and "instant" are different facts and must not render alike.
    const d = stageDurationsMs(parseHarnessTrace({ events: [{ step: 'plan' }] }))
    expect(d.size).toBe(0)
  })

  it('ends a repeated stage at its last mark', () => {
    // plan is recorded again at 90, after scan_universe at 50, so plan closes at
    // 90 and is charged the 40ms since the stage before it — not the 10ms of its
    // first mark, and not 90ms measured from the start of the run.
    const d = stageDurationsMs(stamped([['plan', 10], ['scan_universe', 50], ['plan', 90]]))
    expect(d.get('scan_universe')).toBe(50)
    expect(d.get('plan')).toBe(40)
  })

  it('never reports a negative stage', () => {
    const d = stageDurationsMs(stamped([['scan_universe', 900], ['plan', 100]]))
    expect([...d.values()].every((v) => v >= 0)).toBe(true)
  })
})
