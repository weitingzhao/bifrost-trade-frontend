import { describe, expect, it } from 'vitest'
import type { JournalMemory } from '@/api/research/journal'
import { immuneCheck, traceChain } from './traceModel'

const mem = (over: Partial<JournalMemory> = {}): JournalMemory => ({
  id: 'M-7',
  topic: 'axis-sample',
  kind: 'did',
  axis: 'exit',
  value: '',
  sub: '',
  text: 'Sample memory for the chain.',
  evidence: [
    { source: 'fills', date: '2026-01-05', text: 'AAA closed', route: '' },
    { source: 'fills', date: '2026-01-02', text: 'BBB closed', route: '' },
    { source: 'notes', date: '2026-01-04', text: 'a note', route: '/research/journal' },
  ],
  strength: 0.5,
  change: 'steady',
  archived: false,
  first_seen: '2026-01-06',
  last_seen: '2026-01-09',
  ...over,
})

describe('trace chain (Rev .100 · §22.6)', () => {
  it('walks up from the evidence, one trail node per source, then distill and the memory', () => {
    const nodes = traceChain({
      memory: mem(),
      axes: [{ id: 'exit', label: 'Exit', value: 'early', sub: '', backs: ['M-7'], warn: false }],
      sources: [
        { source: 'fills', enabled: true },
        { source: 'threads', enabled: false },
      ],
    })
    expect(nodes.map((n) => n.tag)).toEqual(['FILLS', 'NOTES', 'DISTILL', 'M-7', 'PROPOSAL', 'OBJECTIVE', 'RUNS', 'VERDICT'])
    expect(nodes[0]).toMatchObject({ at: '2026-01-02 → 2026-01-05', walked: true, go: { to: '/trade/fills' } })
    expect(nodes[1].kids[0].to).toBe('/research/journal')
    expect(nodes[2].sub).toMatch(/Sources on: fills \(/)
    expect(nodes[3].sub).toMatch(/Exit \(“early”\)/)
    expect(nodes[3].go?.to).toBe('/research/agent-personas/you?m=M-7')
  })

  it('draws every downstream arc dashed, each with the reason it is not walked', () => {
    const tail = traceChain({ memory: mem(), axes: [], sources: [] }).slice(-4)
    expect(tail.every((n) => !n.walked && n.at === 'not yet' && n.sub.length > 0)).toBe(true)
  })

  it('reads the immune check from where the evidence stands', () => {
    expect(immuneCheck(mem()).verdict).toBe('rooted')
    expect(immuneCheck(mem({ evidence: [{ source: 'visits', date: 'x', text: '', route: '' }] })).verdict).toBe('yours')
    expect(immuneCheck(mem({ evidence: [{ source: 'decisions', date: 'x', text: '', route: '' }] })).verdict).toBe('echo')
    expect(immuneCheck(mem({ evidence: [] })).verdict).toBe('empty')
  })
})
