import { describe, expect, it } from 'vitest'
import { objectiveBorn, objectiveDial, objectiveOrigin } from './objectiveOrigin'

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

  it('prints the birth line for memory, fork and screen origins, and nothing otherwise', () => {
    expect(objectiveBorn({ policy_json: { origin: { kind: 'memory', memory_id: 'M-7', at: '2026-01-02' } } })).toBe('born from memory M-7 · proposal · 2026-01-02')
    expect(objectiveBorn({ policy_json: { origin: { kind: 'fork', objective_id: 'obj-a', title: 'Alpha' } } })).toBe('⑂ forked from Alpha')
    expect(objectiveBorn({ policy_json: { origin: { kind: 'screen', screen_id: 's1', name: 'Tight' } } })).toBe('promoted from screen Tight')
    expect(objectiveBorn({ policy_json: {} })).toBeNull()
  })
})
