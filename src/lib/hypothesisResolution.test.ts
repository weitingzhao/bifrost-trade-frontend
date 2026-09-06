import { describe, expect, it } from 'vitest'
import { isRuleResolved, resolutionLine } from './hypothesisResolution'

const validated = {
  decision: 'validated' as const,
  rule: { horizon_days: 20, validate_excess: 0.03, reject_excess: -0.03, benchmark: 'SPY' },
  outcome: { horizon_days: 20, benchmark_symbol: 'SPY', excess_return: 0.042 },
}

describe('hypothesis resolution receipt', () => {
  it('reads the excess, the window and the threshold that decided', () => {
    expect(resolutionLine(validated)).toBe(
      'By outcome rule · +4.20% vs SPY over 20 sessions (validate ≥ +3.00%)',
    )
    expect(
      resolutionLine({
        decision: 'rejected',
        rule: { horizon_days: 5, reject_excess: -0.01 },
        outcome: { horizon_days: 5, excess_return: -0.0234 },
      }),
    ).toBe('By outcome rule · −2.34% vs benchmark over 5 sessions (reject ≤ −1.00%)')
  })

  it('is null without a number to show, and only counts settled decisions', () => {
    expect(resolutionLine(null)).toBeNull()
    expect(resolutionLine({ decision: 'validated', outcome: {} })).toBeNull()
    expect(isRuleResolved({ resolution_json: validated })).toBe(true)
    expect(isRuleResolved({ resolution_json: { decision: 'ambiguous' } })).toBe(false)
    expect(isRuleResolved({ resolution_json: null })).toBe(false)
  })
})
