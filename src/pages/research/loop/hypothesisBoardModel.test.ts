import { describe, expect, it } from 'vitest'
import type { Hypothesis } from '@/api/researchHypothesis'
import {
  ageOf,
  laneCounts,
  laneRows,
  hypothesisObjectiveId,
  objectiveScopeReading,
  originDest,
  scopeOf,
} from './hypothesisBoardModel'

const h = (over: Partial<Hypothesis>): Hypothesis =>
  ({ id: 'x', title: 't', thesis: 'th', symbols: [], tags: [], status: 'active', ...over }) as Hypothesis

describe('hypothesis board derivations', () => {
  it('counts lanes on the server states — the design lifecycle has no column', () => {
    const rows = [h({ status: 'active' }), h({ status: 'validated' }), h({ status: 'active' })]
    expect(laneCounts(rows)).toMatchObject({ all: 3, active: 2, validated: 1, rejected: 0 })
    expect(laneRows(rows, 'validated')).toHaveLength(1)
    expect(laneRows(rows, 'all')).toHaveLength(3)
  })

  it('scopes to the first symbol, or BOOK for a book-wide thesis', () => {
    expect(scopeOf(h({ symbols: ['nvda', 'amd'] }))).toBe('NVDA')
    expect(scopeOf(h({ symbols: [] }))).toBe('BOOK')
  })

  it('ages a card from its created_at', () => {
    expect(ageOf('2026-09-01T00:00:00Z', '2026-09-18T12:00:00Z')).toBe('17d')
    expect(ageOf(null, '2026-09-18T12:00:00Z')).toBeNull()
  })

  it('links only origins that name a live page; the rest fall back', () => {
    expect(originDest('analyze-scan')).toEqual({ label: 'Scan', to: '/research/scan' })
    expect(originDest('cockpit_inbox')).toEqual({ label: 'Inbox', to: '/research/loop/decisions' })
    expect(originDest('vol-surface-lab')).toBeNull()
    expect(originDest(null)).toBeNull()
  })
})

describe('objectiveScopeReading', () => {
  const born = (over: Partial<Hypothesis> = {}): Hypothesis =>
    ({ id: 'h', status: 'active', symbols: [], origin_ref: null, ...over }) as Hypothesis

  const runs = new Map([
    ['run-a', 'obj-1'],
    ['run-b', 'obj-2'],
  ])
  const cands = new Map([
    ['cand-a', 'obj-1'],
    ['cand-b', 'obj-2'],
  ])

  it('separates the four reasons a row is or is not in scope', () => {
    // They are different facts and they need different answers: a row opened
    // by hand never had a machine, and a row whose run has been deleted did.
    const out = objectiveScopeReading(
      [
        born({ origin_ref: { run_id: 'run-a' } }),
        born({ origin_ref: { run_id: 'run-b' } }),
        born({ origin_ref: { run_id: 'run-gone' } }),
        born({ origin_ref: { candidate_id: 'cand-a' } }),
        born(),
      ],
      runs,
      cands,
      'obj-1',
    )
    expect(out).toEqual({
      attributable: 2,
      byHand: 1,
      danglingRun: 1,
      otherObjective: 1,
      total: 5,
    })
  })

  it('reaches the objective through the candidate when the run is gone', () => {
    // The case that mattered on DEV: nine rows name runs that were deleted and
    // a candidate that was not. A link is dead only when every path to it is.
    const out = objectiveScopeReading(
      [born({ origin_ref: { run_id: 'run-gone', candidate_id: 'cand-a' } })],
      runs,
      cands,
      'obj-1',
    )
    expect(out.attributable).toBe(1)
    expect(out.danglingRun).toBe(0)
  })

  it('prefers the run when both paths answer', () => {
    expect(
      objectiveScopeReading(
        [born({ origin_ref: { run_id: 'run-b', candidate_id: 'cand-a' } })],
        runs,
        cands,
        'obj-2',
      ).attributable,
    ).toBe(1)
  })

  it('treats an empty run id as no run at all', () => {
    expect(
      objectiveScopeReading([born({ origin_ref: { run_id: '' } })], runs, cands, 'obj-1').byHand,
    ).toBe(1)
  })
})

describe('hypothesisObjectiveId', () => {
  const runs = new Map([['run-a', 'obj-1']])
  const cands = new Map([['cand-a', 'obj-2']])

  it('answers undefined for a row with no provenance to follow', () => {
    // Different from null: one never had a machine, the other had one and the
    // record of it is gone. The banner says which.
    expect(hypothesisObjectiveId({ origin_ref: null }, runs, cands)).toBeUndefined()
    expect(hypothesisObjectiveId({ origin_ref: { source: 'copilot' } }, runs, cands)).toBeUndefined()
  })

  it('answers null when it carried provenance and none of it resolves', () => {
    expect(
      hypothesisObjectiveId({ origin_ref: { run_id: 'gone', candidate_id: 'gone' } }, runs, cands),
    ).toBeNull()
  })

  it('follows the candidate when the run does not answer', () => {
    expect(
      hypothesisObjectiveId({ origin_ref: { run_id: 'gone', candidate_id: 'cand-a' } }, runs, cands),
    ).toBe('obj-2')
  })
})
