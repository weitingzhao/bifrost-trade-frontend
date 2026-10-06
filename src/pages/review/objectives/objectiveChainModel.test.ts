import { describe, expect, it } from 'vitest'
import { RECORD_BY_SOURCE_PATH } from '@/utils/tradeOrigin'
import type { ResearchObjective } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis, TradeLinkBasis } from '@/api/researchHypothesis'
import type { ReviewContract } from '@/utils/reviewContracts'
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

const trade = (realised: number, win: boolean, tradeId: number | null = null): ReviewContract =>
  ({ closedOn: '2026-09-01', realised, win, tradeId }) as ReviewContract

const basis = (over: Partial<TradeLinkBasis> = {}): TradeLinkBasis => ({
  trade_env: 'dev',
  source: 'trade-api /strategies/plans?status=filled (dev)',
  plans_read: 3,
  truncated: false,
  error: null,
  ...over,
})

describe('lineageIsWired', () => {
  it('is the one reading the page turns on: is the derived link readable here', () => {
    expect(lineageIsWired(undefined, 'dev')).toBe(false) // Research before 0.193.0
    expect(lineageIsWired(basis(), null)).toBe(false) // which Trade is this page?
    expect(lineageIsWired(basis({ error: 'unreachable' }), 'dev')).toBe(false)
    expect(lineageIsWired(basis({ trade_env: 'prod' }), 'dev')).toBe(false) // PROD ids are not DEV trades
    expect(lineageIsWired(basis(), 'dev')).toBe(true)
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
      hypotheses: [hyp({ linked_trade_ids: [] })],
      trades: [],
      linkBasis: basis(),
      tradeEnv: 'dev',
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
    const a = chainAction(row({ verdict: 'NOT A MACHINE', to: RECORD_BY_SOURCE_PATH }))
    expect(a).toMatchObject({ label: 'Why →', to: RECORD_BY_SOURCE_PATH })
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
    const t = (closedOn: string) => ({ closedOn, realised: 0, win: true }) as ReviewContract
    expect(chainWindow([t('2026-09-01'), t('2026-02-13'), t('2026-09-18')])).toBe(
      'settled contracts · 2026-02-13 → 2026-09-18 · all accounts',
    )
  })

  it('says nothing closed rather than printing an empty range', () => {
    expect(chainWindow([])).toContain('nothing closed yet')
  })
})

describe('objectiveChain through the derived link (TD-143)', () => {
  // o1's candidate carries hypothesis h1; a filled plan written from h1 became trade 901.
  const withHyp = (objectiveId: string, hypothesisId: string, status = 'promoted') =>
    ({ ...cand(objectiveId, status), hypothesis_id: hypothesisId }) as ResearchCandidate
  const built = objectiveChain({
    objectives: [obj('o1'), obj('o2')],
    candidates: [withHyp('o1', 'h1'), withHyp('o2', 'h2', 'open')],
    hypotheses: [hyp({ id: 'h1', linked_trade_ids: [901] }), hyp({ id: 'h2', linked_trade_ids: [] })],
    trades: [trade(120, true, 901), trade(-40, false, 901), trade(75, true, 555), trade(10, true, null)],
    linkBasis: basis(),
    tradeEnv: 'dev',
    floor: 2,
  })

  it('is not broken: the link reaches the trade and its settled contracts', () => {
    expect(built.wired).toBe(true)
    expect(built.rows[0]).toMatchObject({ traded: 1, settled: 2, hit: 0.5, net: 80 })
    expect(built.rows[0].verdict).toBe('EARNING')
  })

  it('reads an objective whose hypotheses became no trade as zero, not unknown', () => {
    expect(built.rows[1]).toMatchObject({ traded: 0, settled: 0, hit: null, net: null })
  })

  it('leaves only the contracts no linked plan reaches in Unattributed', () => {
    expect(built.unattributed).toMatchObject({ settled: 2, net: 85 })
    expect(built.unattributed.why).not.toContain(BROKEN_LINK)
  })

  it('breaks again, naming the field, when the link is read from another environment', () => {
    const other = objectiveChain({
      objectives: [obj('o1')],
      candidates: [withHyp('o1', 'h1')],
      hypotheses: [hyp({ id: 'h1', linked_trade_ids: [901] })],
      trades: [trade(120, true, 901)],
      linkBasis: basis({ trade_env: 'prod' }),
      tradeEnv: 'dev',
    })
    expect(other.wired).toBe(false)
    expect(other.rows[0]).toMatchObject({ traded: null, settled: null })
    expect(other.rows[0].why).toContain(BROKEN_LINK)
    expect(other.unattributed.settled).toBe(1)
  })
})
