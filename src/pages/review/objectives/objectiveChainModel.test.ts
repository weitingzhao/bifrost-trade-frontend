import { describe, expect, it } from 'vitest'
import type { ResearchObjective } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { ReviewTrade } from '@/utils/reviewTrades'
import { BROKEN_LINK, lineageIsWired, objectiveChain, widestGate } from './objectiveChainModel'

const obj = (id: string): ResearchObjective =>
  ({ id, title: `${id} machine`, status: 'active' }) as ResearchObjective

const cand = (objectiveId: string | null, status = 'open'): ResearchCandidate =>
  ({
    id: `c-${Math.random()}`,
    symbol: 'NVDA',
    status,
    source: 'harness',
    source_ref: objectiveId ? { objective_id: objectiveId } : null,
  }) as unknown as ResearchCandidate

const hyp = (over: Partial<Hypothesis> = {}): Hypothesis =>
  ({ id: 'h1', status: 'active', symbols: [], linked_opportunity_ids: [], ...over }) as Hypothesis

const trade = (realised: number, win: boolean): ReviewTrade =>
  ({ closedOn: '2026-09-01', realised, win }) as ReviewTrade

describe('lineageIsWired', () => {
  it('is the one reading the page turns on', () => {
    expect(lineageIsWired([hyp(), hyp()])).toBe(false)
    expect(lineageIsWired([hyp(), hyp({ linked_opportunity_ids: [7] as never })])).toBe(true)
  })
})

describe('objectiveChain with the link missing', () => {
  const built = objectiveChain({
    objectives: [obj('o1')],
    candidates: [cand('o1'), cand('o1', 'promoted'), cand('o2')],
    hypotheses: [hyp(), hyp()],
    trades: [trade(500, true), trade(-200, false)],
  })

  it('keeps proposed and accepted, which are real', () => {
    expect(built.rows[0]).toMatchObject({ proposed: 2, accepted: 1 })
  })

  it('reads the rest as null, never zero', () => {
    // A zero says "it traded nothing". What is true is "we cannot tell", and
    // the two must not print the same.
    expect(built.rows[0]).toMatchObject({ traded: null, settled: null, hit: null, net: null })
  })

  it('returns no verdict, and names the field rather than describing it', () => {
    expect(built.rows[0].verdict).toBe('NO VERDICT')
    expect(built.rows[0].why).toContain(BROKEN_LINK)
  })

  it('puts every closed trade in Unattributed, with its net', () => {
    // The design makes this row a hard requirement: hiding it would make
    // every rate above it wrong. With the link missing it holds the whole
    // book rather than a remainder.
    expect(built.unattributed).toMatchObject({ settled: 2, net: 300, verdict: 'NOT A MACHINE' })
    expect(built.unattributed.hit).toBe(0.5)
    expect(built.unattributed.why).toContain(BROKEN_LINK)
  })
})

describe('objectiveChain once the link exists', () => {
  it('stops saying the chain is broken', () => {
    const wired = objectiveChain({
      objectives: [obj('o1')],
      candidates: [cand('o1')],
      hypotheses: [hyp({ linked_opportunity_ids: [7] as never })],
      trades: [],
    })
    expect(wired.wired).toBe(true)
    // Zero settled is a reading now, not an unknown — and below the floor it
    // is still no verdict, for the other reason.
    expect(wired.rows[0].settled).toBe(0)
    expect(wired.rows[0].verdict).toBe('NO VERDICT')
    expect(wired.rows[0].why).toContain('5 needed')
  })
})

describe('widestGate', () => {
  it('reports the one gate this side records, and says what it cannot see', () => {
    const g = widestGate({ proposed: 10, accepted: 4 } as never)
    expect(g.share).toBe(0.6)
    expect(g.note).toContain('per run, not per objective')
  })

  it('does not invent a gate for a machine that never ran', () => {
    expect(widestGate({ proposed: 0, accepted: 0 } as never)).toMatchObject({
      label: 'never ran',
      share: null,
    })
  })
})
