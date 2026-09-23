import { describe, expect, it } from 'vitest'
import { VERBS, verbNote, verbsOff, type VerbKey } from '@/lib/harness/artifactVerbs'

const KEYS = VERBS.map((v) => v.key)

describe('the six verbs (Vision §6, design Rev 2026-09-22.7)', () => {
  it('carries all six, in the design order', () => {
    expect(KEYS).toEqual(['explain', 'challenge', 'fork', 'extend', 'settle', 'distill'])
  })

  // Amber marks the one verb that writes, on every card it appears on. Reading
  // it as "look here" is the mistake the marker exists to prevent, so exactly
  // one verb may carry it.
  it('marks exactly one verb as the write', () => {
    expect(VERBS.filter((v) => v.write).map((v) => v.key)).toEqual(['distill'])
  })

  it('turns Settle off on every pending card — inside its horizon is not a miss', () => {
    for (const kind of ['decision_draft', 'order_intent', 'candidate_batch', 'policy_suggestion']) {
      expect(verbsOff(kind).has('settle'), kind).toBe(true)
    }
  })

  it('turns Distill off on a policy, which already is one', () => {
    expect(verbsOff('policy_suggestion').has('distill')).toBe(true)
    expect(verbsOff('playbook_rule').has('distill')).toBe(true)
    expect(verbsOff('candidate_batch').has('distill')).toBe(false)
    expect(verbsOff('decision_draft').has('distill')).toBe(false)
  })

  it('leaves the four reading verbs available everywhere', () => {
    for (const kind of ['decision_draft', 'order_intent', 'candidate_batch', 'policy_suggestion']) {
      for (const k of ['explain', 'challenge', 'fork', 'extend'] as VerbKey[]) {
        expect(verbsOff(kind).has(k), `${kind}/${k}`).toBe(false)
      }
    }
  })

  it('says what a verb would do, differently where the artifact differs', () => {
    expect(verbNote('policy_suggestion', 'distill')).toMatch(/Already a Distill/)
    expect(verbNote('decision_draft', 'distill')).toMatch(/writes nothing/)
    expect(verbNote('candidate_batch', 'distill')).toMatch(/new Inbox card/)
    expect(verbNote('policy_suggestion', 'settle')).toMatch(/policies do not settle/)
    expect(verbNote('decision_draft', 'settle')).toMatch(/inside its horizon/)
  })

  it('gives every verb but Explain a sentence for every kind it can appear on', () => {
    for (const kind of ['decision_draft', 'order_intent', 'candidate_batch', 'policy_suggestion']) {
      for (const k of KEYS) {
        if (k === 'explain') continue
        expect(verbNote(kind, k), `${kind}/${k}`).toBeTruthy()
      }
    }
  })
})
