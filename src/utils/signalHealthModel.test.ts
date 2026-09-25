/**
 * The two readings this page exists to get right: *which* lens is late, and
 * what a headline percentage is made of.
 */
import { describe, expect, it } from 'vitest'
import type { SignalFreshnessItem, SignalHealthResponse } from '@/api/research/similarRegime'
import { blockError, composition, healthLenses, overallRule, readinessRows } from '@/utils/signalHealthModel'

function lens(over: Partial<SignalFreshnessItem>): SignalFreshnessItem {
  return {
    label: 'vrp',
    table: 'features.x',
    max_computed_at: null,
    row_count: 1,
    status: 'fresh',
    age_hours: 4,
    sla_hours: 36,
    ...over,
  }
}

const resp = (freshness: SignalFreshnessItem[]): SignalHealthResponse =>
  ({
    overall: 'ok',
    as_of: '',
    freshness,
    extra_tables: [],
    hypotheses: { counts: {}, total_active: 0, total: 0 },
    canonical_pnl: { insufficient_pct: null },
  }) satisfies SignalHealthResponse

describe('overallRule', () => {
  it('names the oldest lens even when everything is inside cadence', () => {
    // "OK" on its own is a colour. The reader still wants to know how much
    // room is left before it stops being one.
    const r = overallRule(resp([lens({ label: 'vrp', age_hours: 4 }), lens({ label: 'scan', age_hours: 22 })]))
    expect(r.tone).toBe('ok')
    expect(r.text).toContain('scan at 22.0h against a 36h SLA')
  })

  it('names the late lens and what reads off it, not just "degraded"', () => {
    // The whole point of the design's line: which readings to distrust.
    const r = overallRule(resp([lens({ label: 'scan', status: 'stale', age_hours: 44 }), lens({})]))
    expect(r.tone).toBe('warn')
    expect(r.text).toContain('scan (44.0h → Vol ratings)')
    expect(r.text).toContain('carry the amber asof')
  })

  it('says nothing was probed rather than calling an empty board healthy', () => {
    expect(overallRule(resp([]))).toEqual({ text: 'no lens was probed', tone: 'warn' })
  })
})

describe('healthLenses', () => {
  it('turns the SLA into the design’s Expected column', () => {
    expect(healthLenses([lens({})])[0].expected).toBe('within 36h of its run')
  })

  it('says so when a row carries no cadence, rather than assuming one', () => {
    expect(healthLenses([lens({ sla_hours: null })])[0].expected).toBe('no cadence recorded')
  })

  it('links only where this side has the page', () => {
    const [known, unknown] = healthLenses([lens({ label: 'scan' }), lens({ label: 'mystery' })])
    expect(known.downstream?.to).toBe('/research/scan')
    expect(unknown.downstream).toBeNull()
  })
})

describe('composition', () => {
  it('is what the headline is made of, largest first', () => {
    // DEV 2026-09-22: "solver OK 99.7%" over a set that is 91.6% vendor
    // snapshots — the solver succeeded at what it was asked, and it was asked
    // about 8% of the rows.
    const rows = composition({ ok: 173871, vendor_snapshot: 1950684, insufficient_inputs: 5367 })
    expect(rows[0].key).toBe('vendor_snapshot')
    expect(Math.round(rows[0].share * 1000) / 10).toBe(91.6)
  })

  it('is empty rather than dividing by zero', () => {
    expect(composition(undefined)).toEqual([])
    expect(composition({})).toEqual([])
  })
})

describe('blockError', () => {
  it('tells a failed sub-query from an empty one', () => {
    // Both arrive as zeroes. Only this says which, and DEV's IV block is the
    // first: a Postgres statement timeout, not a solver that found nothing.
    expect(blockError({ error: 'canceling statement due to statement timeout\n' })).toBe(
      'canceling statement due to statement timeout',
    )
    expect(blockError({})).toBeNull()
    expect(blockError(undefined)).toBeNull()
  })
})

describe('readinessRows', () => {
  it('shares against the universe, and owes the row it cannot compute', () => {
    const rows = readinessRows({
      universe_count: 5321,
      fundamental: { cached_count: 3522, no_data_count: 1799 },
      technical: { pass_count_distribution: [{ symbol_count: 400 }, { symbol_count: 4139 }] },
    })
    expect(rows[1].value).toBe('4,539 · 85%')
    expect(rows[2].value).toBe('3,522 · 66%')
    // The two sides are counted independently; an intersection here would be
    // an assumption about overlap.
    expect(rows[3].owed).toContain('no intersection')
    expect(rows[4]).toMatchObject({ value: '1,799', warn: true })
  })
})
