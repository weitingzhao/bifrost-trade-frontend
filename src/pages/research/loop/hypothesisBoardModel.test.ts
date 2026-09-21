import { describe, expect, it } from 'vitest'
import type { Hypothesis } from '@/api/researchHypothesis'
import {
  ageOf,
  laneCounts,
  laneRows,
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

  it('separates the three reasons a row is not attributable', () => {
    // They are different facts and they need different answers: a row opened
    // by hand never had a machine, and a row whose run has been deleted did.
    const out = objectiveScopeReading(
      [
        born({ origin_ref: { run_id: 'run-a' } }),
        born({ origin_ref: { run_id: 'run-b' } }),
        born({ origin_ref: { run_id: 'run-gone' } }),
        born({ origin_ref: { candidate_id: 'c1' } }),
        born(),
      ],
      runs,
      'obj-1',
    )
    expect(out).toEqual({ attributable: 1, byHand: 2, danglingRun: 1, total: 5 })
  })

  it('counts a run that resolves to another objective as neither hand nor dangling', () => {
    // It belongs to a machine, just not this one — so it is simply not in the
    // scope, and inflating either explanation would misdescribe the record.
    const out = objectiveScopeReading([born({ origin_ref: { run_id: 'run-b' } })], runs, 'obj-1')
    expect(out).toEqual({ attributable: 0, byHand: 0, danglingRun: 0, total: 1 })
  })

  it('treats an empty run id as no run at all', () => {
    expect(objectiveScopeReading([born({ origin_ref: { run_id: '' } })], runs, 'obj-1').byHand).toBe(1)
  })
})
