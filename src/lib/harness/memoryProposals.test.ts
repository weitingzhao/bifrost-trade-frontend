import { describe, expect, it } from 'vitest'
import type { JournalMemory } from '@/api/research/journal'
import type { ResearchObjective } from '@/api/research/harness'
import { draftFromProposal, memoryProposals } from './memoryProposals'

const mem = (id: string, over: Partial<JournalMemory> = {}): JournalMemory => ({
  id,
  topic: `topic-${id}`,
  kind: 'did',
  axis: null,
  value: '',
  sub: '',
  text: `Memory ${id}.`,
  evidence: [{ source: 'fills', date: '2026-01-01', text: 'x', route: '' }],
  strength: 1,
  change: 'steady',
  archived: false,
  first_seen: null,
  last_seen: null,
  ...over,
})

describe('proposals from memory (§22.4)', () => {
  const memories = [
    mem('M-1'),
    mem('M-2', { kind: 'tension', value: 'ABC' }),
    mem('M-3', { value: 'Opening week' }),
    mem('M-4', { kind: 'tension', strength: 0.3 }),
    mem('M-5', { kind: 'tension', archived: true }),
    mem('M-6', { kind: 'tension' }),
  ]
  const axes = [{ id: 'trigger', label: 'Weak spot', value: 'x', sub: '', backs: ['M-3'], warn: true }]

  it('proposes tensions and weak-spot memories that are strong and not archived', () => {
    const ps = memoryProposals({ memories, axes, hints: {}, objectives: [] })
    expect(ps.map((p) => p.memory.id)).toEqual(['M-2', 'M-3', 'M-6'])
    expect(ps[0]).toMatchObject({ title: 'Flag entries — ABC', scope: 'new entries on ABC; flags only, never blocks (D10)' })
    expect(ps[1].scope).toMatch(/“Opening week”, every symbol/)
    expect(ps[2].title).toBe('Flag the pattern in M-6')
  })

  it('goes quiet at three dismissals unless it was already drafted', () => {
    const drafted = { id: 'o1', status: 'active', policy_json: { origin: { kind: 'memory', memory_id: 'M-2' } } } as unknown as ResearchObjective
    const hints = { 'topic-M-2': 3, 'topic-M-6': 3 }
    const ps = memoryProposals({ memories, axes, hints, objectives: [drafted] })
    expect(ps.map((p) => [p.memory.id, p.drafted?.id ?? null])).toEqual([
      ['M-2', 'o1'],
      ['M-3', null],
    ])
  })

  it('carries the origin edge in the draft body', () => {
    const [p] = memoryProposals({ memories, axes, hints: {}, objectives: [] })
    const body = draftFromProposal(p, '2026-01-09')
    expect(body.schedule).toBe('adhoc')
    expect(body.policy_json).toEqual({ origin: { kind: 'memory', memory_id: 'M-2', topic: 'topic-M-2', n: 1, strength: 1, at: '2026-01-09' } })
    expect(body.description).toMatch(/Born from memory M-2/)
  })
})
