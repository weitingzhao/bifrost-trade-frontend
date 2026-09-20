import { describe, expect, it } from 'vitest'
import type { WatchlistItem } from '@/types/market'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import { census, waitingOnYou, watchlistNames } from './bookCensusModel'

const NOW = Date.parse('2026-09-20T12:00:00Z')
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

const watch = (symbol: string, secType = 'STK', daysOld = 10): WatchlistItem =>
  ({
    contract_key: `${symbol}-STK`,
    symbol,
    sec_type: secType,
    optionable: true,
    category: null,
    category_id: null,
    source: 'manual',
    created_at: (NOW - daysOld * 86_400_000) / 1000,
  }) as WatchlistItem

const hyp = (id: string, symbols: string[], over: Partial<Hypothesis> = {}): Hypothesis =>
  ({
    id,
    title: `${id} thesis`,
    thesis: '',
    symbols,
    tags: [],
    status: 'active',
    origin_page: null,
    origin_ref: null,
    linked_opportunity_ids: [],
    linked_backtest_ids: [],
    conclusion: null,
    created_at: day(30),
    updated_at: day(1),
    retired_at: null,
    ...over,
  }) as Hypothesis

const cand = (id: string, over: Partial<ResearchCandidate> = {}): ResearchCandidate =>
  ({
    id,
    trade_date: '2026-09-16',
    symbol: id.toUpperCase(),
    source: 'harness',
    source_ref: null,
    score: null,
    lens_snapshot: {},
    tags: [],
    status: 'open',
    hypothesis_id: null,
    owner_id: 'owner',
    created_at: day(4),
    ttl_at: day(-1),
    ...over,
  }) as ResearchCandidate

describe('watchlistNames', () => {
  it('counts names, not contracts', () => {
    // An option line on the watchlist is a contract on a name already there.
    expect(watchlistNames([watch('NVDA'), watch('NVDA', 'OPT'), watch('ANET')])).toEqual([
      'ANET',
      'NVDA',
    ])
  })
})

describe('census', () => {
  it('splits the watchlist by whether anything is about it', () => {
    const bands = census(
      [watch('NVDA'), watch('ANET'), watch('PLTR')],
      [hyp('h1', ['NVDA'])],
      [],
    )
    expect(bands[0]).toMatchObject({
      label: 'Watchlist',
      n: 3,
      parts: [
        { label: 'with a thesis', n: 1 },
        { label: 'no thesis', n: 2 },
      ],
    })
  })

  it('counts the pool by who nominated, and only what is open', () => {
    const bands = census(
      [],
      [],
      [
        cand('a'),
        cand('b', { source: 'copilot' }),
        cand('c', { source: 'scan' }),
        // Promoted has left the pool; the band counts what is still in it.
        cand('d', { status: 'promoted' }),
      ],
    )
    expect(bands[1]).toMatchObject({
      label: 'Candidates',
      n: 3,
      parts: [
        { label: 'you', n: 1 },
        { label: 'curator', n: 1 },
        { label: 'screen', n: 1 },
      ],
    })
  })

  it('uses the store’s hypothesis lanes, not the design’s', () => {
    // The design's lanes are active / testing / parked / retired. Printing
    // those words over these counts would make `parked` mean `archived`, and
    // those are opposite claims — one is set aside, the other is done with.
    const bands = census([], [hyp('h1', []), hyp('h2', [], { status: 'archived' })], [])
    expect(bands[2].parts?.map((p) => p.label)).toEqual([
      'active',
      'validated',
      'rejected',
      'archived',
    ])
    expect(bands[2].parts?.find((p) => p.label === 'archived')?.n).toBe(1)
  })

  it('gives Journal a reason rather than a zero', () => {
    // A zero is a count; "nothing counts this" is not one, and the two must
    // not look the same on a census.
    const journal = census([], [], [])[3]
    expect(journal.parts).toBeNull()
    expect(journal.missing).toContain('no artifact store')
  })
})

describe('waitingOnYou', () => {
  it('catches a name no hypothesis is about', () => {
    // The hypothesis here carries a settled position, so it is not itself
    // stuck — leaving the watchlist name as the only row.
    const settled = hyp('h1', ['NVDA'], { linked_opportunity_ids: [7] as never })
    const stuck = waitingOnYou([watch('PLTR', 'STK', 40), watch('NVDA')], [settled], [], NOW)
    expect(stuck).toHaveLength(1)
    expect(stuck[0]).toMatchObject({ kind: 'no thesis', subject: 'PLTR', ageDays: 40 })
  })

  it('leaves a candidate alone until its expiry has passed', () => {
    // ttl a day out: not stuck. ttl two days gone: stuck.
    expect(waitingOnYou([], [], [cand('a')], NOW)).toEqual([])
    const late = waitingOnYou([], [], [cand('a', { ttl_at: day(2) })], NOW)
    expect(late.map((s) => s.kind)).toEqual(['aging in pool'])
  })

  it('calls a live belief thin only while nothing is settled behind it', () => {
    const none = waitingOnYou([], [hyp('h1', ['NVDA'])], [], NOW)
    expect(none.map((s) => s.kind)).toEqual(['thin record'])
    // One with a settled position is not thin.
    const settled = waitingOnYou([], [hyp('h1', ['NVDA'], { linked_opportunity_ids: [7] as never })], [], NOW)
    expect(settled).toEqual([])
    // Nor is one that has already had its answer.
    const done = waitingOnYou([], [hyp('h1', ['NVDA'], { status: 'rejected' })], [], NOW)
    expect(done).toEqual([])
  })

  it('sorts oldest first, across the three kinds', () => {
    const stuck = waitingOnYou(
      [watch('PLTR', 'STK', 5)],
      [hyp('h1', ['NVDA'], { created_at: day(90) })],
      [cand('a', { ttl_at: day(1), created_at: day(30) })],
      NOW,
    )
    expect(stuck.map((s) => [s.kind, s.ageDays])).toEqual([
      ['thin record', 90],
      ['aging in pool', 30],
      ['no thesis', 5],
    ])
  })
})
