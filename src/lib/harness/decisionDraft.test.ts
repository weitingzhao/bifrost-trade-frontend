import { describe, expect, it } from 'vitest'
import { decisionDraftView, VERDICT_GLOSS } from '@/lib/harness/decisionDraft'

const DEV = {
  verdict: 'no_new_action',
  hypothesis_id: 'intc-stage-2a',
  rationale: 'x'.repeat(1200),
  risk_hint: {
    key_risk: 'crowded factor beta',
    invalidation: ['a', 'b'],
    // DEV's name for the walls. The design fixture calls the same object `levels`.
    reference_levels: { put_wall: 110, call_wall: 120, zero_gamma: 104.51 },
  },
  sizing_hint: { instrument: 'no_trade', note: 'No new long.', delta: 0, add_size: 0 },
}

describe('decisionDraftView (design Rev 2026-09-22.7)', () => {
  it('reads the walls under either name, in the design order', () => {
    expect(decisionDraftView(DEV).levelsLine).toBe('PUT WALL 110 · ZERO Γ 104.51 · CALL WALL 120')
    expect(decisionDraftView({ risk_hint: { levels: { put_wall: 170 } } }).levelsLine).toBe('PUT WALL 170')
  })

  it('says not stated when no wall is given', () => {
    expect(decisionDraftView({}).levelsLine).toBe('not stated')
    expect(decisionDraftView({}).keyRisk).toBe('not stated')
  })

  it('does not repeat the walls as label/value lines', () => {
    const v = decisionDraftView(DEV)
    expect(v.levels).toEqual([])
    expect(v.riskOther.map((l) => l.label)).not.toContain('key risk')
  })

  // 0 here is "size not decided", not a zero position — a row reading `delta 0`
  // says the opposite of what the curator meant.
  it('drops delta and add_size when they are zero', () => {
    const labels = decisionDraftView(DEV).sizing.map((l) => l.label)
    expect(labels).not.toContain('delta')
    expect(labels).not.toContain('add size')
    expect(labels).toContain('instrument')
  })

  it('keeps delta when it is not zero', () => {
    const v = decisionDraftView({ sizing_hint: { delta: 0.25 } })
    expect(v.sizing.map((l) => l.label)).toContain('delta')
  })

  it('glosses every verdict the curator writes', () => {
    expect(decisionDraftView(DEV).verdictGloss).toBe(VERDICT_GLOSS.no_new_action)
    for (const slug of [
      'no_new_action',
      'watch_only_no_entry',
      'watch_defined_risk_only',
      'avoid_watch_only',
      'avoid_at_current_price_pullback_watch',
    ]) {
      expect(VERDICT_GLOSS[slug], slug).toBeTruthy()
    }
  })

  it('leaves an unknown verdict unglossed rather than inventing one', () => {
    expect(decisionDraftView({ verdict: 'something_new' }).verdictGloss).toBeNull()
  })
})
