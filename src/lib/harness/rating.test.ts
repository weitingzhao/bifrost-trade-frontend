import { describe, it, expect } from 'vitest'
import { actionTone, fmtPct, memoHeadline, parseRating, stars, summarize, traceRatings } from './rating'
import type { HarnessTrace } from './harnessTrace'

/** NVDA as rating.py rated it on run_1a07c0fe66e48109e. */
const NVDA = {
  version: 1,
  symbol: 'nvda',
  grade: 'A',
  grade_score: 81.69,
  stage: 'STAGE_2A',
  conviction: 2,
  conviction_reason: 'judges dissent',
  action: 'hold_no_add',
  action_label: 'Hold — no add',
  action_reason: 'portfolio persona opposed adding',
  levels: { pivot: 236.54, entry_lo: 236.54, entry_hi: 248.37, stop: 217.62, stop_source: '8% cap', risk_pct: 8, target_2r: 274.39, target_3r: 293.31, rr: 2 },
  timing: { pct_vs_pivot: -3.42, pct_vs_50d: 8.85, zone: 'below_pivot', above_50d: true },
  outlook: 'stable',
  score_drift: { from: 81.69, to: 81.69, delta: 0 },
  instrument: { stage_row: 'uptrend', iv_col: 'cold', iv_rank: 19, suggestion: 'Buy stock · long calls', note: 'Convexity is cheap; do not sell premium into it.' },
  inputs: { net: 'dissent', agreement: 'dissent', validate: 'caution', portfolio: 'oppose', blocked: false, hit_rate: 0.5, judged: 8 },
  basis: { path: 'PIVOT', components: { structure: 92.9, trend_template: 100 }, checks_passed: { technical: 11 }, close: 228.45, sma_50: 209.87, sma_200: 196.46, low_52w: 164.07, high_52w: 236.54, invalidation: ['close breaks below the 50-day (209.87)'] },
  why: 'judges dissent; portfolio persona opposed adding.',
}

describe('parseRating', () => {
  it('reads what the run wrote and never recomputes it', () => {
    const r = parseRating(NVDA)!
    expect(r.symbol).toBe('NVDA')
    expect(r.grade).toBe('A')
    expect(r.conviction).toBe(2)
    expect(r.action).toBe('hold_no_add')
    // The levels are the run's figures, to the cent.
    expect(r.levels).toMatchObject({ entry_lo: 236.54, entry_hi: 248.37, stop: 217.62, target_2r: 274.39 })
    expect(r.timing.zone).toBe('below_pivot')
    expect(r.instrument.suggestion).toBe('Buy stock · long calls')
    expect(r.basis?.invalidation).toEqual(['close breaks below the 50-day (209.87)'])
    expect(r.basis?.components.trend_template).toBe(100)
  })

  it('tolerates a rating with no levels, unknown action, or junk', () => {
    const r = parseRating({ ...NVDA, levels: null, action: 'moon', timing: {}, outlook: 'sideways', basis: null })!
    expect(r.levels).toBeNull()
    expect(r.action).toBe('watch')
    expect(r.timing.zone).toBe('unknown')
    expect(r.outlook).toBeNull()
    expect(r.basis).toBeNull()
    expect(parseRating(null)).toBeNull()
    expect(parseRating({ grade: 'A' })).toBeNull()
    expect(parseRating({ symbol: 'X', conviction: 9 })!.conviction).toBe(5)
  })

  it('reads the run’s ranked list from the rate event', () => {
    const trace = { events: [{ step: 'rate', ratings: [NVDA, { symbol: 'LPG', action: 'watch', conviction: 2 }, null] }], progress: null } as unknown as HarnessTrace
    expect(traceRatings(trace).map((r) => r.symbol)).toEqual(['NVDA', 'LPG'])
    expect(traceRatings({ events: [], progress: null } as unknown as HarnessTrace)).toEqual([])
  })
})

describe('the words on top', () => {
  it('shows five glyphs so position reads, not a count', () => {
    expect(stars(2)).toBe('★★☆☆☆')
    expect(stars(5)).toBe('★★★★★')
    expect(stars(0)).toBe('☆☆☆☆☆')
    expect(stars(7)).toBe('★★★★★')
  })

  it('maps each action to the tone that says what it means', () => {
    expect(actionTone('buy_zone')).toBe('success')
    expect(actionTone('avoid')).toBe('danger')
    expect(actionTone('hold_no_add')).toBe('warning')
    expect(actionTone('watch')).toBe('neutral')
  })

  it('formats signed percentages with a real minus', () => {
    expect(fmtPct(-3.42)).toBe('−3.4%')
    expect(fmtPct(8.86)).toBe('+8.9%')
    expect(fmtPct(0)).toBe('0.0%')
    expect(fmtPct(null)).toBe('—')
  })

  it('writes the headline from the ratings, so it cannot disagree with the deck', () => {
    const r = parseRating(NVDA)!
    const blocked = { ...r, symbol: 'BG', action: 'avoid' as const, conviction: 1, inputs: { ...r.inputs, blocked: true, agreement: 'agree' } }
    const watch = { ...r, symbol: 'LPG', action: 'watch' as const, inputs: { ...r.inputs, agreement: 'agree' } }
    const s = summarize([r, blocked, watch])
    expect(s).toMatchObject({ total: 3, best: 2, split: 1, blocked: 1 })
    expect(memoHeadline([r, blocked, watch], 3475)).toBe(
      '3 candidates from 3,475. None above ★★ — nothing actionable yet. judges split on 1, validate blocked 1.',
    )
    const buy = { ...watch, action: 'buy_zone' as const, conviction: 4 }
    expect(memoHeadline([buy, r], null)).toBe('2 candidates. 1 actionable, best ★★★★. judges split on 1.')
    expect(memoHeadline([], 10)).toBe('No candidates were rated.')
  })
})
