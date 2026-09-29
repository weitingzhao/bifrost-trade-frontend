import { describe, expect, it } from 'vitest'
import { objectiveDial, objectiveOrigin } from './objectiveOrigin'

describe('objective origin (Rev .100)', () => {
  it('reads a memory origin from policy_json and nothing else', () => {
    expect(objectiveOrigin({ policy_json: { origin: { kind: 'memory', memory_id: 'M-7', topic: 't', n: 3, strength: 0.8, at: '2026-01-02' } } })).toEqual({
      kind: 'memory',
      memory_id: 'M-7',
      topic: 't',
      n: 3,
      strength: 0.8,
      at: '2026-01-02',
    })
    expect(objectiveOrigin({ policy_json: {} })).toBeNull()
    expect(objectiveOrigin({ policy_json: { origin: { kind: 'hypothesis', memory_id: 'M-1' } } })).toBeNull()
    expect(objectiveOrigin(null)).toBeNull()
  })

  it('reads L1 only when the loop decides and Trust grants L0', () => {
    expect(objectiveDial({ mode: 'auto' }, true).dial).toBe('L1')
    expect(objectiveDial({ mode: 'auto' }, false).dial).toBe('L0')
    expect(objectiveDial({ mode: 'assisted' }, true).dial).toBe('L0')
    expect(objectiveDial({ mode: 'hand' }, true).dial).toBe('L0')
    expect(objectiveDial({}, true).dial).toBe('L0')
  })
})
