import { describe, expect, it } from 'vitest'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { ObjectiveLeash } from '@/pages/research/loop/leash'
import {
  LOOP_STATIONS,
  candidatesBook,
  dialLevelFromTrust,
  loopCards,
  earnRow,
  hypothesesBook,
  isToday,
  L2_NEED,
  watchlistBook,
} from './overviewModel'

// Invented fixtures — never copied from DEV (workspace rule).
const hyp = (status: Hypothesis['status'], origin: string | null): Hypothesis =>
  ({ id: 'h', title: 't', thesis: '', symbols: [], tags: [], status, origin_page: origin }) as unknown as Hypothesis

const cand = (source: string, ttlAt: string | null): ResearchCandidate =>
  ({ id: 'c', symbol: 'ZZZ', source, status: 'open', ttl_at: ttlAt, trade_date: '2026-09-18' }) as unknown as ResearchCandidate

const NOW = '2026-09-19T12:00:00Z'

describe('dialLevelFromTrust', () => {
  it('reads L1 from an armed grant and L0 otherwise — the only two levels that exist', () => {
    expect(dialLevelFromTrust(true)).toBe('L1')
    expect(dialLevelFromTrust(false)).toBe('L0')
    expect(dialLevelFromTrust(undefined)).toBe('L0')
  })
})

describe('earnRow', () => {
  const row = (judged: number, hit: number | null): ObjectiveLeash => ({
    id: 'o',
    title: 'Daily loop',
    floor: 0.45,
    floorIsDefault: true,
    hitRate: hit,
    judged,
    horizonDays: 20,
    standing: 'clears',
  })

  it('picks the objective with the most settled outcomes', () => {
    const r = earnRow([row(3, 0.4), { ...row(24, 0.58), title: 'Best' }])
    expect(r?.title).toBe('Best')
    expect(r?.settled).toBe(24)
    expect(r?.need).toBe(L2_NEED)
    expect(r?.pct).toBeCloseTo(80)
  })

  it('returns null when nothing has settled — no invented progress', () => {
    expect(earnRow([row(0, null)])).toBeNull()
    expect(earnRow([])).toBeNull()
  })
})

describe('the Book rows', () => {
  it('splits hypotheses by the operator that wrote them', () => {
    const rows = [
      hyp('active', null), // manual → hand
      hyp('active', 'candidate_batch_approve'), // loop
      hyp('validated', 'cockpit_inbox'), // copilot
    ]
    const b = hypothesesBook(rows)
    expect(b.share).toEqual({ hand: 1, loop: 1, copilot: 1, total: 3 })
    expect(b.meta).toBe('3 · 2 active · 1 validated')
  })

  it('counts expiring candidates against the Pool page rule (ttl inside 2d)', () => {
    const b = candidatesBook(
      [cand('curator', '2026-09-20T00:00:00Z'), cand('you', '2026-10-01T00:00:00Z'), cand('screen', null)],
      NOW,
    )
    expect(b.share).toEqual({ hand: 2, loop: 1, copilot: 0, total: 3 })
    expect(b.meta).toBe('3 in pool · 1 expire in 2d')
  })

  it('calls the watchlist all hand — the market store has no author column', () => {
    expect(watchlistBook(6)).toEqual({
      share: { hand: 6, loop: 0, copilot: 0, total: 6 },
      meta: '6 · all by hand',
    })
  })
})

describe('isToday', () => {
  it('compares the date part only', () => {
    expect(isToday('2026-09-19T01:00:00Z', NOW)).toBe(true)
    expect(isToday('2026-09-18T23:59:00Z', NOW)).toBe(false)
    expect(isToday(null, NOW)).toBe(false)
  })
})

describe('the loop circuit', () => {
  it('keeps all six stations, in the order the circuit is read', () => {
    // The order is the argument: 01→03 across the top, then back 06→05→04
    // along the bottom. A station sorted by number would draw the return
    // edge as a straight line, which is the one thing the panel exists to
    // deny.
    expect(LOOP_STATIONS.map((s) => s.n)).toEqual(['01', '02', '03', '06', '05', '04'])
    expect(LOOP_STATIONS.filter((s) => s.row === 'top')).toHaveLength(3)
    expect(LOOP_STATIONS.filter((s) => s.row === 'bottom')).toHaveLength(3)
  })

  it('marks the two stations whose product leaves Research', () => {
    const crossing = LOOP_STATIONS.filter((s) => s.crossNote).map((s) => s.name)
    expect(crossing).toEqual(['Feed back', 'Settle'])
  })

  it('takes the counts the stations table already computed', () => {
    // Not recomputed here: the same figure computed twice is the failure an
    // overview invites (§14.2).
    const cards = loopCards([
      { name: 'Scan', h: '—', l: '3', c: '—' },
      { name: 'Decide', h: '2', l: '2', c: '1' },
    ])
    expect(cards.find((c) => c.name === 'Scan')?.counts).toBe('— · 3 · —')
    expect(cards.find((c) => c.name === 'Decide')?.counts).toBe('2 · 2 · 1')
  })

  it('keeps a station the page did not count, and says nothing rather than zero', () => {
    // A station missing from the loop would say the loop has five.
    const cards = loopCards([])
    expect(cards).toHaveLength(6)
    expect(cards.every((c) => c.counts === '— · — · —')).toBe(true)
  })

  it('sends every chip to a route, and names the page it opens', () => {
    for (const st of LOOP_STATIONS) {
      expect(st.pages.length, st.name).toBeGreaterThan(0)
      for (const p of st.pages) {
        expect(p.to.startsWith('/'), `${st.name} · ${p.label}`).toBe(true)
        expect(p.tip.length, `${st.name} · ${p.label}`).toBeGreaterThan(10)
      }
    }
  })
})
