/**
 * Fixtures here are invented, not copied from DEV. The Journal joins five
 * stores and what it must never do is invent an edge, so the tests are mostly
 * about what happens when an edge is absent.
 */
import { describe, expect, it } from 'vitest'
import {
  buildJournalTrees,
  draftParentId,
  hypothesisCandidateId,
  journalCounts,
  journalDays,
  journalDefaultDay,
  journalNodes,
  journalPct,
  policyChanges,
  type JournalNode,
} from './journalModel'
import type { ObjectiveRun } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { AiDraft } from '@/api/researchDrafts'
import type { CandidateOutcomeRow } from '@/api/research/candidateOutcome'

const run = {
  id: 'run_test_1',
  objective_id: 'obj-test',
  status: 'awaiting_approval',
  started_at: '2026-01-02T09:00:00+00:00',
  finished_at: '2026-01-02T09:04:00+00:00',
  plan_json: { generated_by: 'harness', persona: 'tester', llm_model: 'model-x' },
  outputs: { candidate_ids: ['cand-aaa'], draft_ids: ['drf-1'] },
  trace_json: null,
} as unknown as ObjectiveRun

const candidate = {
  id: 'cand-aaa',
  symbol: 'AAA',
  trade_date: '2026-01-02',
  created_at: '2026-01-02T09:02:00+00:00',
  source: 'harness',
  source_ref: { run_id: 'run_test_1', objective_id: 'obj-test' },
  status: 'open',
  score: 42,
  hypothesis_id: 'hyp-aaa',
  lens_snapshot: { stage: 'STAGE_9Z', path: 'TEST', grade: 'A' },
  owner_id: null,
  tags: [],
  ttl_at: null,
} as unknown as ResearchCandidate

const hypothesis = {
  id: 'hyp-aaa',
  title: 'AAA holds the line',
  thesis: 'A made-up thesis for a made-up name.',
  symbols: ['AAA'],
  tags: [],
  status: 'active',
  origin_page: 'candidate-pool',
  origin_ref: { candidate_id: 'cand-aaa', source: 'hand' },
  linked_opportunity_ids: [],
  linked_backtest_ids: [],
  conclusion: null,
  resolution_json: null,
  retired_at: null,
  created_at: '2026-01-02T10:00:00+00:00',
  updated_at: '2026-01-02T10:00:00+00:00',
} as unknown as Hypothesis

const draft = {
  id: 'drf-1',
  kind: 'policy_suggestion',
  scope: 'objective:obj-test',
  status: 'pending',
  generated_by: 'weekly_policy_review',
  linked_action_id: null,
  created_at: '2026-01-02T11:00:00+00:00',
  expires_at: null,
  payload: {
    hypothesis_id: 'hyp-aaa',
    current_policy: { layers: { sepa: { min_score: 70 } } },
    suggestion: { layers: { sepa: { min_score: 78 } } },
  },
} as unknown as AiDraft

const outcome: CandidateOutcomeRow = {
  candidate_id: 'cand-aaa',
  symbol: 'AAA',
  trade_date: '2026-01-02',
  horizon_days: 1,
  entry_close: 10,
  exit_close: 11,
  exit_date: '2026-01-03',
  forward_return: 0.1,
  benchmark_symbol: 'BENCH',
  benchmark_return: 0.02,
  excess_return: 0.08,
  hit: true,
  source: 'harness',
}

const sketch = () => ['TEST · stage 9Z', 'grade A']

function build(over: Partial<Parameters<typeof journalNodes>[0]> = {}) {
  return journalNodes(
    {
      runs: [run],
      candidates: [candidate],
      hypotheses: [hypothesis],
      drafts: [draft],
      outcomes: [outcome],
      ...over,
    },
    sketch,
  )
}

describe('the join', () => {
  it('hangs the whole chain under the run that started it', () => {
    const trees = buildJournalTrees(build())
    expect(trees).toHaveLength(1)
    expect(trees[0].nodes.map((n) => [n.id, n.depth])).toEqual([
      ['run_test_1', 0],
      ['cand-aaa', 1],
      ['hyp-aaa', 2],
      ['drf-1', 3],
      ['settlement cand-aaa @1d', 2],
    ])
  })

  it('makes an orphan a root of its own rather than inventing its parent', () => {
    // The prototype synthesises a placeholder parent. A parent nobody wrote is
    // a fact invented on screen, so the node stands alone — and its
    // provenance still names the parent it could not reach.
    const trees = buildJournalTrees(build({ runs: [] }))
    expect(trees.map((t) => t.root.id)).toEqual(['cand-aaa'])
    const cand = trees[0].nodes[0]
    expect(cand.provenance.find(([k]) => k === 'parent')?.[1]).toBe('run_test_1')
  })

  it('reads a draft parent in the order the store offers one', () => {
    expect(draftParentId(draft)).toBe('hyp-aaa')
    expect(draftParentId({ payload: { run_id: 'r' }, scope: 's' })).toBe('r')
    expect(draftParentId({ payload: {}, scope: 'only-scope' })).toBe('only-scope')
  })

  it('reads a hypothesis back to its candidate, and to nothing when there is none', () => {
    expect(hypothesisCandidateId(hypothesis)).toBe('cand-aaa')
    expect(hypothesisCandidateId({ origin_ref: null })).toBeNull()
    expect(hypothesisCandidateId({ origin_ref: { run_id: 'r' } })).toBeNull()
  })

  it('lists only days that hold an artifact, newest first', () => {
    expect(journalDays(build())).toEqual(['2026-01-03', '2026-01-02'])
  })
})

describe('which day the page opens on', () => {
  it('opens on the newest day that holds a run, not the newest day of any kind', () => {
    // The settlement lands on the 3rd; the run worked on the 2nd. A draft can
    // expire on a Sunday, and opening there shows a page with no tree in it.
    expect(journalDefaultDay(build())).toBe('2026-01-02')
  })

  it('lets a deep link bring its own day', () => {
    expect(journalDefaultDay(build(), 'settlement cand-aaa @1d')).toBe('2026-01-03')
  })

  it('falls back to the newest day of any kind when no run is in reach', () => {
    const nodes = journalNodes(
      { runs: [], candidates: [], hypotheses: [], drafts: [], outcomes: [outcome] },
      sketch,
    )
    expect(journalDefaultDay(nodes)).toBe('2026-01-03')
  })

  it('answers empty rather than guessing when there is nothing at all', () => {
    expect(journalDefaultDay([])).toBe('')
  })

  it('ignores a selection nothing in the window answers', () => {
    expect(journalDefaultDay(build(), 'no-such-artifact')).toBe('2026-01-02')
  })
})

describe('who wrote it', () => {
  it('calls a page-written hypothesis hand, and the machine’s own machine', () => {
    const nodes = build()
    const by = (id: string) => nodes.find((n) => n.id === id)
    expect(by('hyp-aaa')?.operator).toBe('hand')
    expect(by('run_test_1')?.operator).toBe('loop')
    expect(by('cand-aaa')?.operator).toBe('loop')
  })

  it('keeps the store’s own word for the author beside the three-way tag', () => {
    const nodes = journalNodes(
      { runs: [], candidates: [], hypotheses: [], drafts: [draft], outcomes: [] },
      sketch,
    )
    expect(nodes[0].operator).toBe('loop')
    expect(nodes[0].operatorRaw).toBe('weekly_policy_review')
  })

  it('reads copilot off the source the candidate carries', () => {
    const nodes = journalNodes(
      {
        runs: [],
        candidates: [{ ...candidate, source: 'copilot' } as ResearchCandidate],
        hypotheses: [],
        drafts: [],
        outcomes: [],
      },
      sketch,
    )
    expect(nodes[0].operator).toBe('copilot')
  })
})

describe('what settled', () => {
  it('states the excess against the benchmark', () => {
    const node = build().find((n) => n.type === 'settlement')
    expect(node?.state).toBe('settled · right')
    expect(node?.diff).toBe('+8.00%')
    expect(node?.day).toBe('2026-01-03')
  })

  it('keeps an unjudged outcome apart from a miss', () => {
    // A null `hit` is a silence, not a verdict against the candidate.
    const nodes = journalNodes(
      { runs: [], candidates: [], hypotheses: [], drafts: [], outcomes: [{ ...outcome, hit: null }] },
      sketch,
    )
    expect(nodes[0].state).toBe('settled · unjudged')
  })

  it('says the attribution is missing rather than naming a lens nothing measured', () => {
    const node = build().find((n) => n.type === 'settlement')
    expect(node?.provenance.find(([k]) => k === 'attribution')?.[1]).toMatch(/not recorded/)
  })

  it('prints a sign a reader can see without colour', () => {
    expect(journalPct(0.0123)).toBe('+1.23%')
    expect(journalPct(-0.0123)).toBe('−1.23%')
    expect(journalPct(null)).toBe('—')
  })
})

describe('what the store cannot answer', () => {
  it('leaves the three fork readings without a number', () => {
    const nodes = build()
    const counts = journalCounts(nodes, nodes.filter((n) => n.type === 'settlement'))
    const nulls = counts.filter((c) => c.value == null).map((c) => c.label)
    // A zero here would say the loop tried nothing, rather than that nobody
    // writes a fork down.
    expect(nulls).toEqual(['branches', 'considered, not merged'])
    expect(counts.find((c) => c.label === 'branches')?.detail).toMatch(/no fork is recorded/)
  })

  it('keeps a thread row on every artifact and marks it unrecorded', () => {
    for (const n of build()) {
      const threadish = n.provenance.find(([k]) => k === 'thread' || k === 'attribution')
      expect(threadish?.[1], n.id).toMatch(/not recorded/)
    }
  })
})

describe('policyChanges', () => {
  it('states a nested change as one path, from and to', () => {
    expect(policyChanges({ layers: { sepa: { min_score: 70 } } }, { layers: { sepa: { min_score: 78 } } })).toEqual([
      { path: 'layers.sepa.min_score', from: '70', to: '78' },
    ])
  })

  it('marks a key the current policy does not have', () => {
    expect(policyChanges({}, { max_candidates: 7 })).toEqual([
      { path: 'max_candidates', from: '—', to: '7' },
    ])
  })

  it('says nothing when nothing moved', () => {
    const p = { a: 1, b: { c: [1, 2] } }
    expect(policyChanges(p, { ...p })).toEqual([])
  })

  it('shows a diff on the patch node when the payload carries both sides', () => {
    const node = build().find((n) => n.type === 'patch')
    expect(node?.diff).toBe('layers.sepa.min_score 70 → 78')
  })
})

describe('a cycle', () => {
  it('drops out of the trees instead of hanging the page', () => {
    // Two nodes each naming the other as parent: neither is a root, so the
    // pair is simply not drawn. Nothing in these five stores can make one —
    // the parent of an artifact always lives in a store written earlier — but
    // a walk that recurses on data it did not write should not be the thing
    // that finds out.
    const a: JournalNode = { ...build()[0], id: 'a', parentId: 'b', depth: 0 }
    const b: JournalNode = { ...a, id: 'b', parentId: 'a' }
    expect(buildJournalTrees([a, b])).toEqual([])
  })
})
