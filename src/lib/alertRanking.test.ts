import { describe, it, expect } from 'vitest'
import {
  bellBadgeClass,
  bellState,
  rankAlerts,
  severityBadgeClass,
  severityRank,
  severityTextClass,
  worstSeverity,
} from './alertRanking'

const a = (severity: string, trade_date: string, tag = '') => ({ severity, trade_date, tag })

describe('severityRank', () => {
  it('orders high before warn before info', () => {
    expect(severityRank('high')).toBeLessThan(severityRank('warn'))
    expect(severityRank('warn')).toBeLessThan(severityRank('info'))
  })

  it('sorts anything unrecognised last rather than treating it as high', () => {
    expect(severityRank('catastrophic')).toBeGreaterThan(severityRank('info'))
    expect(severityRank('')).toBeGreaterThan(severityRank('info'))
    expect(severityRank(null)).toBeGreaterThan(severityRank('info'))
  })

  it('is case-insensitive', () => {
    expect(severityRank('HIGH')).toBe(severityRank('high'))
  })
})

describe('rankAlerts — the defect this fixes', () => {
  it('surfaces an older high above three fresher warns', () => {
    // Exactly the shape /research/alerts returns: newest first, unranked.
    const items = [
      a('warn', '2026-09-04', 'w1'),
      a('warn', '2026-09-04', 'w2'),
      a('warn', '2026-09-04', 'w3'),
      a('high', '2026-09-02', 'H'),
    ]
    expect(items.slice(0, 3).some((x) => x.tag === 'H')).toBe(false) // before
    expect(rankAlerts(items)[0].tag).toBe('H') // after
  })

  it('keeps newest first within one severity', () => {
    const out = rankAlerts([
      a('warn', '2026-09-01', 'old'),
      a('warn', '2026-09-05', 'new'),
      a('warn', '2026-09-03', 'mid'),
    ])
    expect(out.map((x) => x.tag)).toEqual(['new', 'mid', 'old'])
  })

  it('is stable when severity and date both tie', () => {
    const out = rankAlerts([
      a('info', '2026-09-01', 'first'),
      a('info', '2026-09-01', 'second'),
    ])
    expect(out.map((x) => x.tag)).toEqual(['first', 'second'])
  })

  it('does not mutate its input', () => {
    const items = [a('info', '2026-09-01', 'i'), a('high', '2026-09-01', 'h')]
    const before = items.map((x) => x.tag)
    rankAlerts(items)
    expect(items.map((x) => x.tag)).toEqual(before)
  })

  it('handles an empty list', () => {
    expect(rankAlerts([])).toEqual([])
  })
})

describe('worstSeverity — what the closed badge has to say', () => {
  it('reports the worst present, not the most recent', () => {
    expect(worstSeverity([a('info', '2026-09-05'), a('high', '2026-09-01')])).toBe('high')
    expect(worstSeverity([a('info', '2026-09-05'), a('warn', '2026-09-01')])).toBe('warn')
  })

  it('is null for an empty list', () => {
    expect(worstSeverity([])).toBeNull()
  })

  it('still reports an unrecognised severity when it is all there is', () => {
    expect(worstSeverity([a('odd', '2026-09-01')])).toBe('odd')
  })
})

describe('tone classes', () => {
  it('keeps the text tones the bell already used', () => {
    expect(severityTextClass('high')).toBe('text-destructive')
    expect(severityTextClass('warn')).toBe('text-warning')
    expect(severityTextClass('info')).toBe('text-muted-foreground')
  })

  it('gives the badge a fill that tracks severity instead of fixed amber', () => {
    expect(severityBadgeClass('high')).toContain('bg-destructive')
    expect(severityBadgeClass('warn')).toContain('bg-warning')
    expect(severityBadgeClass('info')).toContain('bg-muted-foreground')
    expect(severityBadgeClass('high')).not.toContain('amber')
  })
})

describe('bellState — silence is not all-clear', () => {
  const q = (o: Partial<Parameters<typeof bellState>[0]>) =>
    bellState({ isPending: false, isError: false, items: [], ...o })

  it('does not report "clear" when the check itself failed', () => {
    // The bell used to destructure only `data`, so a failed fetch dropped the
    // badge and the popover read "No analyze alerts" — identical to all-clear.
    expect(q({ isError: true, items: [] }).kind).toBe('unavailable')
    expect(q({ isError: true, items: undefined }).kind).toBe('unavailable')
  })

  it('separates "not asked yet" from "asked, nothing there"', () => {
    expect(q({ isPending: true, items: undefined }).kind).toBe('checking')
    expect(q({ items: [] }).kind).toBe('clear')
  })

  it('prefers a stale list over an error — something beats nothing', () => {
    const s = q({ isError: true, items: [a('high', '2026-09-01')] })
    expect(s.kind).toBe('alerts')
    expect(s.kind === 'alerts' && s.worst).toBe('high')
  })

  it('counts and ranks what it has', () => {
    const s = q({ items: [a('info', '2026-09-02'), a('warn', '2026-09-01')] })
    expect(s).toEqual({ kind: 'alerts', count: 2, worst: 'warn' })
  })

  it('gives the unknown badge a grey that is not a severity', () => {
    expect(bellBadgeClass({ kind: 'unavailable' })).toContain('bg-lamp-gray')
    expect(bellBadgeClass({ kind: 'unavailable' })).not.toContain('destructive')
    expect(bellBadgeClass({ kind: 'alerts', count: 1, worst: 'high' })).toContain('bg-destructive')
  })
})
