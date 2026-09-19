import { describe, expect, it } from 'vitest'
import type { Hypothesis } from '@/api/researchHypothesis'
import { ageOf, laneCounts, laneRows, originDest, scopeOf } from './hypothesisBoardModel'

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
