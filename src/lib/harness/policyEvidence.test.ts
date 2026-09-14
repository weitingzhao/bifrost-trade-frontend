import { describe, expect, it } from 'vitest'
import { fmtSignedPct, policyEvidenceView } from './policyEvidence'

// Trimmed from the weekly review's policy_suggestion on DEV, 2026-09-13 (2026-W37).
const weekly = {
  window_days: 90,
  judged_outcomes: 32,
  outcome_summary: {
    days: 90,
    candidates: 40,
    pending: 8,
    horizons: [{ horizon_days: 1, hit_rate: 0.5, hits: 16, judged: 32, avg_excess: 0.0010677228517685863 }],
  },
  persona_eval: {
    symbols_evaluated: 8,
    blocked_by_validate: 6,
    dissent_count: 3,
    eligible_count: 1,
    models: [{ model: 'deepseek-chat', provider: 'deepseek', calls: 8, ok: 7, fallback: 1, cost_usd: 0.226186 }, { calls: 8 }],
    per_symbol: [
      {
        symbol: 'LPG',
        agreement: 'dissent',
        net_stance: 'dissent',
        validate_stance: 'oppose',
        blocked_by_validate: true,
        models: [
          { model: 'deepseek-chat', net: 'caution', validate: 'oppose', fallback: false },
          { model: 'gpt-4o-mini', net: 'support', validate: 'support', fallback: false },
        ],
        verdicts: [
          { agent: 'analyze', model: 'deepseek-chat', stance: 'caution', summary: 'Trend template 100 but structure 0.0', summary_zh: '结构 0.0' },
          { stance: 'support' },
        ],
      },
      { agreement: 'agree' },
    ],
  },
}

describe('policyEvidenceView', () => {
  it('keeps the structure the one-line dump threw away', () => {
    const view = policyEvidenceView(weekly)
    expect(view.outcomes).toEqual({
      days: 90,
      candidates: 40,
      pending: 8,
      horizons: [{ horizonDays: 1, hitRate: 0.5, hits: 16, judged: 32, avgExcess: 0.0010677228517685863 }],
    })
    expect(view.persona).toMatchObject({ evaluated: 8, blocked: 6, dissent: 3, eligible: 1 })
    // A model entry with no name, a symbol with no ticker, a verdict with no agent: dropped, not rendered blank.
    expect(view.persona?.models.map((m) => m.model)).toEqual(['deepseek-chat'])
    expect(view.persona?.symbols.map((s) => s.symbol)).toEqual(['LPG'])
    expect(view.persona?.symbols[0]).toMatchObject({ agreement: 'dissent', validateStance: 'oppose', blocked: true })
    expect(view.persona?.symbols[0].byModel.map((m) => `${m.model} ${m.net}/${m.validate}`)).toEqual([
      'deepseek-chat caution/oppose',
      'gpt-4o-mini support/support',
    ])
    expect(view.persona?.symbols[0].verdicts).toEqual([
      { agent: 'analyze', model: 'deepseek-chat', stance: 'caution', summary: 'Trend template 100 but structure 0.0', summaryZh: '结构 0.0' },
    ])
  })

  it('reads a harness draft, which sends only the persona eval', () => {
    const view = policyEvidenceView({ persona_eval: { symbols_evaluated: 3 } })
    expect(view.outcomes).toBeNull()
    expect(view.persona).toMatchObject({ evaluated: 3, models: [], symbols: [] })
    expect(policyEvidenceView({})).toEqual({ outcomes: null, persona: null })
  })
})

describe('fmtSignedPct', () => {
  it('signs excess returns', () => {
    expect(fmtSignedPct(0.0010677)).toBe('+0.11%')
    expect(fmtSignedPct(-0.0048588)).toBe('-0.49%')
    expect(fmtSignedPct(null)).toBe('—')
  })
})
