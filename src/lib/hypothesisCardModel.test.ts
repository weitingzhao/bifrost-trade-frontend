import { describe, it, expect } from 'vitest'
import { rankTags, salientThesis, splitTitleRef } from './hypothesisCardModel'

// Verbatim from /research/hypothesis/summary/active, 2026-09-09.
const SCSC =
  'Stock-first composite funnel (SEPA / Momentum / Events) with optional option ' +
  'overlay; aligned with Discover Stock Explorer. On 2026-09-08 SEPA PIVOT grade A ' +
  'score 77.25 stage 2A, trend template 100, momentum 80, close $58.48 (+7.8% over ' +
  '50-day 54.27, -12.4% off 52w high 66.78). Technology distribution name in Stage 2.'

const NVDA =
  'Stock-first daily loop pick (universe stock_composite). SEPA PIVOT grade A, ' +
  'score 81.7/STAGE_2A, structure 92.9 (real — not the 0.0 artifact seen across ' +
  'peers), trend_template 100, close $228.45 above 50d $209.87. CAREFUL: NVDA is ' +
  'already the largest single-name exposure.'

describe('splitTitleRef', () => {
  it('lifts a trailing run id out of a generated title', () => {
    expect(splitTitleRef('Daily Loop Stock Explorer · SCSC (run_1a081364889cde94e)')).toEqual({
      title: 'Daily Loop Stock Explorer · SCSC',
      ref: 'run_1a081364889cde94e',
    })
  })

  it('leaves a hand-written title alone', () => {
    const t = 'NVDA SEPA A pivot — book-coverage tracking'
    expect(splitTitleRef(t)).toEqual({ title: t, ref: null })
  })

  it('keeps a meaningful parenthetical', () => {
    const t = 'HALO pivot tracking (stock-first)'
    expect(splitTitleRef(t)).toEqual({ title: t, ref: null })
  })

  it('does not blank a title that is only an id', () => {
    expect(splitTitleRef('(run_1a081364889cde94e)').title).toBe('(run_1a081364889cde94e)')
  })
})

describe('salientThesis', () => {
  it('skips the shared template opening and leads with the figures', () => {
    const out = salientThesis(SCSC)
    expect(out.startsWith('On 2026-09-08 SEPA PIVOT grade A')).toBe(true)
    expect(out).not.toContain('composite funnel')
  })

  it('is what makes two loop cards distinguishable', () => {
    // The defect: an unranked two-line clamp shows this same prefix on both.
    const shared = 'Stock-first composite funnel'
    expect(SCSC.startsWith(shared)).toBe(true)
    expect(salientThesis(SCSC)).not.toContain(shared)
  })

  it('does not split a dollar amount or an ISO date into sentences', () => {
    const out = salientThesis(NVDA)
    expect(out).toContain('close $228.45 above 50d $209.87')
    expect(out.startsWith('SEPA PIVOT grade A')).toBe(true)
  })

  it('keeps trailing prose after the numeric sentence', () => {
    expect(salientThesis(NVDA)).toContain('CAREFUL')
  })

  it('falls back to the whole text when no sentence carries a figure', () => {
    const t = 'A qualitative read. No numbers here at all.'
    expect(salientThesis(t)).toBe(t)
  })

  it('keeps the opening when it is already the numeric one', () => {
    const t = 'Score 81 today. Follow-on colour.'
    expect(salientThesis(t)).toBe(t)
  })

  it('handles empty and missing input', () => {
    expect(salientThesis('')).toBe('')
    expect(salientThesis(null)).toBe('')
    expect(salientThesis(undefined)).toBe('')
  })
})

describe('rankTags', () => {
  it('puts what the thesis claims ahead of how it was produced', () => {
    const tags = ['harness', 'candidate_batch', 'stock', 'sepa', 'pivot', 'daily-loop', 'from-candidate']
    expect(rankTags(tags).slice(0, 3)).toEqual(['stock', 'sepa', 'pivot'])
  })

  it('loses no tag and keeps informative order stable', () => {
    const tags = ['daily-loop', 'candidate_batch', 'stock', 'sepa', 'pivot', 'tracking', 'holding']
    const out = rankTags(tags)
    expect(out).toHaveLength(tags.length)
    expect([...out].sort()).toEqual([...tags].sort())
    expect(out.slice(0, 5)).toEqual(['stock', 'sepa', 'pivot', 'tracking', 'holding'])
  })

  it('keeps an unrecognised tag visible rather than hiding it', () => {
    expect(rankTags(['harness', 'gamma-squeeze']).slice(0, 1)).toEqual(['gamma-squeeze'])
  })

  it('is case-insensitive about plumbing', () => {
    expect(rankTags(['HARNESS', 'sepa'])[0]).toBe('sepa')
  })

  it('handles an empty list', () => {
    expect(rankTags([])).toEqual([])
  })
})
