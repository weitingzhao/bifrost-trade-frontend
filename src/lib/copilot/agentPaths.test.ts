import { describe, expect, it } from 'vitest'
import { agentPathLabel, agentPaths, notRoutableNote } from './agentPaths'

describe('agentPaths', () => {
  it('reads the chat path off the triage handoffs', () => {
    expect(agentPaths('discovery')).toEqual(['chat'])
    expect(agentPaths('explain')).toEqual(['chat'])
  })

  it('adds the batch path for the chain a candidate batch is graded by', () => {
    expect(agentPaths('analyze')).toEqual(['chat', 'batch'])
    expect(agentPathLabel('portfolio')).toBe('chat · batch')
  })

  it('gives the loop\u2019s curator the batch path alone', () => {
    // It carried a triage handoff until 2026-09-21 and so read `chat · batch`
    // on a bench whose whole point is that you cannot route to it.
    expect(agentPaths('loop_curator')).toEqual(['batch'])
  })

  it('has no path for a name nothing routes to', () => {
    expect(agentPaths('nobody')).toEqual([])
    expect(agentPathLabel('nobody')).toBe('—')
  })
})

describe('notRoutableNote', () => {
  it('says why the two rows the design greys cannot be chosen', () => {
    // Not a pair of ids in a component: the day a tenth agent arrives, a
    // hard-coded pair is wrong and says nothing about it.
    expect(notRoutableNote('verdict')).toBe('composed · via triage')
    expect(notRoutableNote('loop_curator')).toBe('after a batch')
  })

  it('says nothing about a row you can pick', () => {
    expect(notRoutableNote('analyze')).toBeNull()
    expect(notRoutableNote('write')).toBeNull()
  })
})
