import { describe, expect, it } from 'vitest'
import { kindTag } from './draftText'
import { writesTo, WRITES_TO_ORDER } from './writesTo'

describe('writesTo', () => {
  it('maps every decision kind to one of the five places', () => {
    expect(writesTo('candidate_batch')).toBe('pool')
    expect(writesTo('hypothesis_draft')).toBe('book')
    expect(writesTo('hypothesis_suggestion')).toBe('book')
    expect(writesTo('playbook_rule')).toBe('rules')
    expect(writesTo('decision_draft')).toBe('nothing')
    expect(writesTo('order_intent')).toBe('nothing')
    expect(writesTo('rule')).toBe('rules')
  })

  it('files a playbook note with the rules (Owner 2026-10-04 #10) — it used to be in no place', () => {
    expect(writesTo('playbook_note')).toBe('rules')
  })

  it('splits a policy suggestion by scope (Rev .143 #3)', () => {
    expect(writesTo('policy_suggestion', 'objective:obj-a')).toBe('policy')
    expect(writesTo('policy_suggestion', 'opportunity:O1')).toBe('rules')
    expect(writesTo('policy_suggestion')).toBe('rules')
  })

  it('names no place for a briefing', () => {
    expect(writesTo('eod_verdict')).toBeNull()
    expect(writesTo('daily_digest')).toBeNull()
  })

  it('agrees with the tag: one word per place', () => {
    const word = { rules: 'rule', policy: 'patch', book: 'hypothesis', pool: 'candidates', nothing: 'call' } as const
    const cases: [string, string?][] = [
      ['candidate_batch'],
      ['hypothesis_draft'],
      ['playbook_note'],
      ['playbook_rule'],
      ['decision_draft'],
      ['order_intent'],
      ['policy_suggestion', 'objective:x'],
      ['policy_suggestion', 'opportunity:y'],
    ]
    for (const [kind, scope] of cases) {
      const place = writesTo(kind, scope)
      expect(place, kind).not.toBeNull()
      expect(kindTag(kind, scope), kind).toBe(word[place as keyof typeof word])
    }
    expect(WRITES_TO_ORDER).toEqual(['rules', 'policy', 'book', 'pool', 'nothing'])
  })
})
