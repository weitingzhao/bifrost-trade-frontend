import { describe, expect, it } from 'vitest'
import { formatPolicyLeaf, mergePolicyValue, policyDiffView } from './policyDiff'

// The weekly review's suggestion on DEV, 2026-09-13 (2026-W37), trimmed.
const current = {
  preset: 'neutral',
  max_candidates: 8,
  universe_mode: 'stock_composite',
  layers: {
    sepa: { path: null, grade: null, stage: ['SETUP', 'PIVOT'], required: true, min_score: 70 },
    events: { required: false, within_days: 5, min_importance: 2 },
    momentum: { path: null, grade: 'A', required: false, min_score: null },
  },
  option_overlay: { enabled: true, required: false, flag_filter: 'iv_rank:hot' },
}
const suggestion = {
  // Repeats every layer it leaves alone; only sepa.min_score moves.
  layers: {
    sepa: { path: null, grade: null, stage: ['SETUP', 'PIVOT'], required: true, min_score: 75 },
    events: { required: false, within_days: 5, min_importance: 2 },
    momentum: { path: null, grade: 'A', required: false, min_score: null },
  },
  require_validate_pass: true,
}

describe('policyDiffView', () => {
  it('names the leaves that move, not the whole value that contains them', () => {
    const diff = policyDiffView({ current_policy: current, suggestion })
    expect(diff.changes).toEqual([
      { path: 'layers.sepa.min_score', key: 'layers', from: 70, to: 75 },
      { path: 'require_validate_pass', key: 'require_validate_pass', from: undefined, to: true },
    ])
    expect(diff.unchanged.map((u) => u.key)).toEqual(expect.arrayContaining(['preset', 'max_candidates', 'universe_mode', 'option_overlay']))
  })

  it('diffs against the merge the server does, so a partial layer patch keeps its neighbours', () => {
    const diff = policyDiffView({ current_policy: current, suggestion: { layers: { sepa: { min_score: 80 } } } })
    expect(diff.changes).toEqual([{ path: 'layers.sepa.min_score', key: 'layers', from: 70, to: 80 }])
  })

  it('calls a field unchanged when the merge lands on what is already there', () => {
    const diff = policyDiffView({ current_policy: current, suggestion: { layers: { events: { within_days: 5 } } } })
    expect(diff.changes).toEqual([])
    expect(diff.unchanged.map((u) => u.key)).toContain('layers')
  })
})

describe('mergePolicyValue', () => {
  it('merges layers and option_overlay two levels deep and replaces anything else', () => {
    expect(mergePolicyValue('option_overlay', { enabled: true, required: false }, { required: true })).toEqual({ enabled: true, required: true })
    expect(mergePolicyValue('max_candidates', 8, 6)).toBe(6)
  })

  it('merges resolution the same way, so a threshold patch does not read as dropping the horizon', () => {
    const diff = policyDiffView({
      current_policy: { resolution: { enabled: true, horizon_days: 20, validate_excess: 0.03 } },
      suggestion: { resolution: { validate_excess: 0.05 } },
    })
    expect(diff.changes).toEqual([{ path: 'resolution.validate_excess', key: 'resolution', from: 0.03, to: 0.05 }])
  })
})

describe('formatPolicyLeaf', () => {
  it('reads absent and null as not set', () => {
    expect([undefined, null, '', true, 75, ['SETUP']].map(formatPolicyLeaf)).toEqual(['not set', 'not set', '(empty)', 'true', '75', '["SETUP"]'])
  })
})
