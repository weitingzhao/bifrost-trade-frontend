import { describe, expect, it } from 'vitest'
import { agentsThatWroteOn, humanKind, nyDate, rowCost, type RunCost } from './agentActivity'
import type { AiDraft } from '@/api/researchDrafts'

function draft(
  generated_by: string,
  kind: string,
  created_at: string,
  payload: Record<string, unknown> = {},
): AiDraft {
  return {
    id: `${generated_by}-${created_at}`,
    kind: kind as AiDraft['kind'],
    payload,
    scope: 's',
    status: 'pending',
    generated_by,
    linked_action_id: null,
    created_at,
    expires_at: null,
  }
}

describe('nyDate', () => {
  it('puts a late-UTC instant on the ET day it belongs to', () => {
    // 2026-09-12T01:30Z is 21:30 on 11 Sep in New York — the EOD agent's own
    // slot. Bucketing it by UTC would file the whole EOD pass under tomorrow.
    expect(nyDate(new Date('2026-09-12T01:30:00Z'))).toBe('2026-09-11')
    expect(nyDate(new Date('2026-09-11T21:30:42Z'))).toBe('2026-09-11')
    expect(nyDate(new Date('2026-09-11T13:30:00Z'))).toBe('2026-09-11')
  })
})

describe('agentsThatWroteOn', () => {
  const rows = [
    draft('eod_agent', 'eod_verdict', '2026-09-11T21:30:42Z'),
    draft('eod_agent', 'eod_verdict', '2026-09-11T21:30:10Z'),
    draft('eod_agent', 'playbook_note', '2026-09-11T21:29:00Z'),
    draft('digest_agent', 'daily_digest', '2026-09-11T11:30:00Z'),
    draft('eod_agent', 'eod_verdict', '2026-09-10T21:30:00Z'), // yesterday
  ]

  it('groups by agent, counts what each wrote, and keeps its latest write', () => {
    const out = agentsThatWroteOn(rows, '2026-09-11')
    expect(out.map((r) => r.agent)).toEqual(['eod_agent', 'digest_agent'])
    const eod = out[0]
    expect(eod.writes).toBe(3)
    expect(eod.lastAt).toBe('2026-09-11T21:30:42Z')
    expect(eod.produced).toEqual([
      { kind: 'eod_verdict', n: 2 },
      { kind: 'playbook_note', n: 1 },
    ])
  })

  it('leaves yesterday out', () => {
    expect(agentsThatWroteOn(rows, '2026-09-11')[0].writes).toBe(3)
    expect(agentsThatWroteOn(rows, '2026-09-10')).toEqual([
      expect.objectContaining({ agent: 'eod_agent', writes: 1 }),
    ])
    expect(agentsThatWroteOn(rows, '2026-09-09')).toEqual([])
  })

  it('orders by what ran most recently', () => {
    // Checking on the agents is a "did the last one land" question, so the one
    // that just wrote goes first.
    expect(agentsThatWroteOn(rows, '2026-09-11').map((r) => r.agent)).toEqual([
      'eod_agent',
      'digest_agent',
    ])
  })

  it('does not drop a write whose agent is missing', () => {
    const out = agentsThatWroteOn([draft('', 'daily_digest', '2026-09-11T12:00:00Z')], '2026-09-11')
    expect(out).toEqual([expect.objectContaining({ agent: 'unattributed', writes: 1 })])
  })

  it('collects the runs a row\'s drafts came out of, today only', () => {
    // Spend is recorded per objective run; the page sums what these runs cost.
    const out = agentsThatWroteOn(
      [
        draft('harness', 'candidate_batch', '2026-09-11T13:34:00Z', { run_id: 'run_b' }),
        draft('harness', 'policy_suggestion', '2026-09-11T13:35:00Z', { run_id: 'run_a' }),
        draft('harness', 'candidate_batch', '2026-09-11T13:36:00Z', { run_id: 'run_b' }),
        draft('harness', 'candidate_batch', '2026-09-10T13:34:00Z', { run_id: 'run_yesterday' }),
      ],
      '2026-09-11',
    )
    expect(out[0].runIds).toEqual(['run_a', 'run_b'])
  })

  it('gives a row no runs when its drafts link none — its spend is not recorded, not zero', () => {
    const out = agentsThatWroteOn(
      [
        draft('eod_agent', 'eod_verdict', '2026-09-11T21:30:00Z'),
        draft('loop_curator', 'decision_draft', '2026-09-11T14:00:00Z', { run_id: 42 }),
      ],
      '2026-09-11',
    )
    expect(out.map((r) => [r.agent, r.runIds])).toEqual([
      ['eod_agent', []],
      ['loop_curator', []],
    ])
  })

  it('ignores a row with an unreadable timestamp instead of bucketing it', () => {
    expect(agentsThatWroteOn([draft('eod_agent', 'eod_verdict', 'nonsense')], '2026-09-11')).toEqual([])
  })
})

describe('humanKind', () => {
  it('reads as words', () => {
    expect(humanKind('eod_verdict')).toBe('eod verdict')
    expect(humanKind('daily_digest')).toBe('daily digest')
  })
})

describe('rowCost', () => {
  const costs = (entries: [string, RunCost][]) => new Map(entries)

  it('says spend is not recorded when the row links no run', () => {
    expect(rowCost([], costs([]))).toEqual({ state: 'unrecorded' })
  })

  it('waits while any run is still loading', () => {
    expect(rowCost(['a', 'b'], costs([['a', 0.3], ['b', 'loading']]))).toEqual({ state: 'loading' })
    // A run the page has not asked about yet is loading, not free.
    expect(rowCost(['a'], costs([]))).toEqual({ state: 'loading' })
  })

  it('says the runs are gone when the service no longer has any of them', () => {
    // 2026-09-04 and 09-07 on DEV: two harness runs each, both 404 "run not
    // found" — the drafts outlived them. The first version rendered "$0.00+".
    expect(rowCost(['a', 'b'], costs([['a', 'gone'], ['b', 'gone']]))).toEqual({
      state: 'gone',
      runs: 2,
    })
  })

  it('does not print a total when no run could be read', () => {
    expect(rowCost(['a', 'b'], costs([['a', 'error'], ['b', 'gone']]))).toEqual({
      state: 'unreadable',
      runs: 2,
    })
  })

  it('totals what it could read and says how much it is missing', () => {
    expect(rowCost(['a', 'b', 'c'], costs([['a', 0.3019], ['b', 'error'], ['c', 'gone']]))).toEqual({
      state: 'total',
      usd: 0.3019,
      runs: 3,
      unread: 2,
    })
    expect(rowCost(['a', 'b'], costs([['a', 0.3019], ['b', 'error']]))).toEqual({
      state: 'total',
      usd: 0.3019,
      runs: 2,
      unread: 1,
    })
    expect(rowCost(['a', 'b'], costs([['a', 0.1], ['b', 0.2]]))).toMatchObject({ state: 'total', unread: 0 })
  })
})

