import { describe, expect, it } from 'vitest'
import type { SymbolVerdicts } from '@/api/research/symbolVerdicts'
import { toneForBand } from '@/lib/lensVerdict'
import type { SymbolProposal } from '@/api/research/symbolVerdicts'
import {
  decisionChips,
  lensChips,
  proposalChips,
  proposalLabel,
  proposalTone,
  verdictChips,
  verdictSummary,
} from './symbolVerdicts'

const data: SymbolVerdicts = {
  symbol: 'NVDA',
  generated_at: '2026-09-07T05:00:00+00:00',
  digest: {
    day: '2026-09-07',
    draft_id: 'drf',
    status: 'pending',
    lenses: [
      { lens: 'iv_rank', band: 'cold', value: 18.7, means: 'premium cheap', as_of: '2026-09-04' },
      { lens: 'vrp', band: null, value: null, means: null, as_of: null },
    ],
    proposed: true,
    batches: [
      {
        run_id: 'run_1',
        objective_title: 'Daily Loop Stock Explorer',
        status: 'awaiting_approval',
        auto_accepted: false,
        held_reasons: ['judges did not agree (dissent)', 'net stance dissent'],
      },
    ],
    dissent: {
      judges: ['deepseek-chat: support', 'gpt-4o-mini: abstain'],
      wrong_if: ['path leaves PIVOT'],
    },
    resolution: null,
    line: 'iv_rank cold · held: judges did not agree (dissent) · judges split',
  },
  proposals: [
    {
      kind: 'action',
      id: 'a1',
      status: 'executed',
      state: 'executed',
      title: 'propose candidate',
      by_copilot: true,
      created_at: '2026-09-07T03:00:01+00:00',
      tool: 'research.loop.propose_candidate',
      approved_by: 'owner',
    },
    {
      kind: 'candidate',
      id: 'c1',
      status: 'open',
      state: 'proposed',
      title: 'Candidate · copilot',
      by_copilot: true,
      created_at: '2026-09-07T03:00:00+00:00',
      source: 'copilot',
    },
    {
      kind: 'hypothesis',
      id: 'h1',
      status: 'validated',
      state: 'validated',
      title: 'NVDA IV extreme short',
      by_copilot: true,
      created_at: '2026-09-06T20:00:00+00:00',
      by_rule: true,
    },
    {
      kind: 'draft',
      id: 'd1',
      status: 'pending',
      state: 'awaiting approval',
      title: 'NVDA short strangle',
      by_copilot: true,
      created_at: '2026-09-07T01:00:00+00:00',
      draft_kind: 'order_intent',
    },
  ],
  counts: { action: 1, candidate: 1, hypothesis: 1, draft: 1 },
  advisory: 'D10 BLOCKED',
}

describe('symbol verdict chips (D4)', () => {
  it('turns the digest lines and the proposals into chips with tones and approval states', () => {
    const chips = verdictChips(data)
    expect(chips.map((c) => c.label)).toEqual([
      'iv_rank: Buy premium bias',
      'Held: judges did not agree (dissent)',
      'Judges split',
      'propose candidate · executed',
      'Candidate · proposed (Copilot)',
      'Hypothesis · validated by rule',
      'order intent · awaiting approval',
    ])
    expect(chips[0].tone).toBe(toneForBand('iv_rank', 'cold')) // the hub's own tone for that band
    expect(chips[1].tone).toBe('warning')
    expect(chips[2].title).toContain('wrong if: path leaves PIVOT')
    expect(chips[4].to).toBe('/research/loop/candidates?symbol=NVDA')
    expect(chips[5].tone).toBe('success')
    expect(chips[6].tone).toBe('warning')
    expect(verdictChips(undefined)).toEqual([])
  })

  it('reads a proposal state as a tone', () => {
    expect(proposalTone({ kind: 'candidate', status: 'promoted' })).toBe('success')
    expect(proposalTone({ kind: 'action', status: 'error' })).toBe('danger')
    expect(proposalTone({ kind: 'draft', status: 'dismissed' })).toBe('neutral')
    expect(
      proposalLabel({
        kind: 'candidate',
        id: 'c',
        status: 'open',
        state: 'proposed',
        title: null,
        by_copilot: false,
        created_at: null,
        source: 'harness',
      })
    ).toBe('Candidate · proposed (harness)')
  })
})

describe('verdict summary — the strip folds the proposals into one line', () => {
  it('counts each kind with how many are still in play, how many wait on a decision, and what happened last', () => {
    const s = verdictSummary(data)
    expect(s.total).toBe(4)
    expect(s.parts).toEqual([
      '1 candidate (1 open)',
      '1 hypothesis',
      '1 draft (1 pending)',
      '1 action',
    ])
    expect(s.waiting).toBe(2) // the open candidate and the pending draft; the executed action waits on nobody
    expect(s.last).toEqual({
      label: 'propose candidate · executed',
      day: '2026-09-07',
      to: '/research/loop/decisions',
    })
  })

  it('splits the chips by who said them; the full list keeps the reading order', () => {
    expect(lensChips(data).map((c) => c.label)).toEqual(['iv_rank: Buy premium bias'])
    expect(decisionChips(data).map((c) => c.label)).toEqual([
      'Held: judges did not agree (dissent)',
      'Judges split',
    ])
    expect(proposalChips(data)).toHaveLength(4)
    expect(verdictChips(data)).toEqual([
      ...lensChips(data),
      ...decisionChips(data),
      ...proposalChips(data),
    ])
  })

  it('is empty without data, pluralises by count, and picks the newest by time rather than by position', () => {
    expect(verdictSummary(undefined)).toEqual({ total: 0, parts: [], waiting: 0, last: null })
    const extra: SymbolProposal[] = [
      {
        kind: 'candidate',
        id: 'c2',
        status: 'dismissed',
        state: 'dismissed',
        title: null,
        by_copilot: false,
        created_at: '2026-09-05T00:00:00+00:00',
      },
      {
        kind: 'action',
        id: 'a2',
        status: 'proposed',
        state: 'proposed',
        title: 'size the trade',
        by_copilot: true,
        created_at: '2026-09-08T00:00:00+00:00',
        tool: 'x',
      },
    ]
    const s = verdictSummary({ ...data, proposals: [...data.proposals, ...extra] })
    expect(s.parts).toEqual([
      '2 candidates (1 open)',
      '1 hypothesis',
      '1 draft (1 pending)',
      '2 actions (1 awaiting)',
    ])
    expect(s.waiting).toBe(3)
    expect(s.last).toEqual({
      label: 'size the trade · proposed',
      day: '2026-09-08',
      to: '/research/loop/decisions',
    })
  })
})
