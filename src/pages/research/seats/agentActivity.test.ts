import { describe, expect, it } from 'vitest'
import { agentsThatWroteOn, humanKind, nyDate } from './agentActivity'
import type { AiDraft } from '@/api/researchDrafts'

function draft(generated_by: string, kind: string, created_at: string): AiDraft {
  return {
    id: `${generated_by}-${created_at}`,
    kind: kind as AiDraft['kind'],
    payload: {},
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
