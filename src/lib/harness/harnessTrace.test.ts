import { describe, expect, it } from 'vitest'
import { funnelReach, parseHarnessTrace, traceFunnel } from './harnessTrace'

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
