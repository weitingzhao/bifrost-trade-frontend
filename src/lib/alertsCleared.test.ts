import { describe, expect, it } from 'vitest'
import type { AlertGroup } from '@/hooks/useAlerts'
import { alertKey, withoutCleared } from './alertsCleared'

/** Made-up items; nothing here is a real alert. */
const groups: AlertGroup[] = [
  { id: 'risk', title: 'Risk', source: 'x', state: 'ready', items: [
    { id: 'a', title: 'A', when: 'now', lamp: 'red' },
    { id: 'b', title: 'B', when: 'now', lamp: 'yellow' },
  ] },
  { id: 'system', title: 'System', source: 'y', state: 'ready', items: [{ id: 'a', title: 'C', when: 'now', lamp: 'gray' }] },
] as AlertGroup[]

describe('cleared alerts (design Rev .72 §10)', () => {
  it('drops only the cleared item of its own source', () => {
    const out = withoutCleared(groups, new Set([alertKey('risk', 'a')]))
    expect(out[0].items.map((i) => i.id)).toEqual(['b'])
    expect(out[1].items.map((i) => i.id)).toEqual(['a'])
  })

  it('leaves the groups as they were when nothing is cleared', () => {
    expect(withoutCleared(groups, new Set())).toEqual(groups)
  })
})
