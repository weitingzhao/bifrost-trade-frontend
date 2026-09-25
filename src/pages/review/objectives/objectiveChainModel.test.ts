import { describe, expect, it } from 'vitest'
import type { ResearchObjective } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { ReviewTrade } from '@/utils/reviewTrades'
import {
  BROKEN_LINK,
  chainAction,
  chainWindow,
  lineageIsWired,
  objectiveChain,
  widestGate,
  type ChainRow,
} from './objectiveChainModel'

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

describe('objectiveChain mode tag', () => {
  it('carries the stored mode, and the Unattributed row wears none', () => {
    const built = objectiveChain({
      objectives: [{ ...obj('o1'), mode: 'hand' }, obj('o2')],
      candidates: [],
      hypotheses: [],
      trades: [],
    })
    expect(built.rows.map((r) => r.mode)).toEqual(['hand', null])
    expect(built.unattributed.mode).toBeNull()
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

describe('chainAction', () => {
  const row = (over: Partial<ChainRow>): ChainRow =>
    ({ id: 'r', title: 't', verdict: 'NO VERDICT', why: 'because.', to: null, ...over }) as ChainRow

  it('sends the unattributed row where settled money is read by source of idea', () => {
    const a = chainAction(row({ verdict: 'NOT A MACHINE', to: '/portfolio/outcome' }))
    expect(a).toMatchObject({ label: 'Why →', to: '/portfolio/outcome' })
  })

  it('never prints "Nothing to change" over a row nobody could judge', () => {
    // The design's wording fits an objective that clears its floor. On a row
    // with no verdict it would be the opposite claim.
    const a = chainAction(row({ verdict: 'NO VERDICT' }))
    expect(a.label).toBe('No evidence yet')
    expect(a.to).toBeNull()
    expect(a.why).toContain('because.')
  })

  it('draws no link where there is nothing to draft from', () => {
    // A patch has to carry evidence, and there is no patch store either way.
    expect(chainAction(row({ verdict: 'DID NOT EARN' })).to).toBeNull()
    expect(chainAction(row({ verdict: 'EARNING' })).label).toBe('Nothing to change')
  })
})

describe('chainWindow', () => {
  it('states the span the figures are actually true of, not the design’s 90 days', () => {
    // This side reads every canonical execution with no window at all.
    const t = (closedOn: string) => ({ closedOn, realised: 0, win: true }) as ReviewTrade
    expect(chainWindow([t('2026-09-01'), t('2026-02-13'), t('2026-09-18')])).toBe(
      'settled trades · 2026-02-13 → 2026-09-18 · all accounts',
    )
  })

  it('says nothing closed rather than printing an empty range', () => {
    expect(chainWindow([])).toContain('nothing closed yet')
  })
})
