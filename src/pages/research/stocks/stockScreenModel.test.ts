import { describe, expect, it } from 'vitest'
import type { SepaWideRow } from '@/api/research/sepaScreenerWide'
import type { MomentumScore } from '@/api/researchEngine'
import type { VolRow } from '@/lib/research/volRatingsModel'
import {
  AXES,
  barsCleared,
  clears,
  conditionCount,
  focusOnVisible,
  funnelsOf,
  joinNames,
  matchRate,
  passesAll,
  rowProbe,
  runStages,
  sepaParts,
  sepaScoreAt,
  versionDiff,
  visibleAxes,
  type NameRow,
  type ScreenState,
} from './stockScreenModel'
import { LEGACY_SCREEN, STAGES } from './stockScreenStages'
import { toSavedDefinition } from './stockScreenView'

const MODEL_W = { trend: 35, growth: 30, mom: 20, opt: 15 }

function wide(symbol: string, over: Partial<SepaWideRow> = {}): SepaWideRow {
  return {
    symbol,
    eval_date: '2026-01-05',
    overall_rank: 1,
    composite_score: 0.5,
    tech_pass_count: 6,
    fund_pass_count: 4,
    company_name: `${symbol} Corp`,
    primary_exchange: 'XNAS',
    latest_close: 10,
    sma_50: 9,
    crs_percentile: 50,
    return_252d: 0.1,
    momentum_score: 0.4,
    structure_score: null,
    conditions: { price_gt_sma50: true, crs_ge_70: false },
    ...over,
  }
}

function radar(symbol: string, grade: string, score: number): MomentumScore {
  return { symbol, trade_date: '2026-01-02', score, grade, path: 'EXT' } as MomentumScore
}

function prem(symbol: string, serverScore: number, ivRank: number): VolRow {
  return {
    symbol,
    tradeDate: '2026-01-02',
    close: 10,
    scores: { iv_rank: ivRank, vrp: 50, atm_slope: 50, pin: 50, terrain: 50 },
    raw: { ivRank, vrp: 50, slope: 0, pinPct: 0.01 },
    regime: 'range',
    flags: {},
    serverScore,
    dteToOpex: 10,
  }
}

// A composite the mart would write: .35·t/11 + .30·f/8 + .20·m + .15·(opt ?? .5).
function comp(t: number, f: number, m: number, opt: number | null): number {
  return 0.35 * (t / 11) + 0.3 * (f / 8) + 0.2 * m + 0.15 * (opt ?? 0.5)
}

const ROWS: NameRow[] = joinNames(
  [
    wide('AAA', { tech_pass_count: 11, fund_pass_count: 6, momentum_score: 0.8, structure_score: 0.62, composite_score: comp(11, 6, 0.8, 0.62) }),
    wide('BBB', { tech_pass_count: 9, fund_pass_count: 2, momentum_score: 0.3, composite_score: comp(9, 2, 0.3, null) }),
    wide('CCC', { tech_pass_count: 3, fund_pass_count: 1, momentum_score: 0.1, composite_score: comp(3, 1, 0.1, null) }),
  ],
  [radar('AAA', 'A', 76.1), radar('BBB', 'C', 51.2), radar('ZZZ', 'A+', 88)],
  [prem('AAA', 74, 63), prem('CCC', 40, 20)],
)
const probe = rowProbe(new Map())
const row = (s: string) => ROWS.find((r) => r.sym === s)!

describe('joining the three stores', () => {
  it('puts every name any store knows in the pool, rated only where rated', () => {
    expect(ROWS.map((r) => r.sym).sort()).toEqual(['AAA', 'BBB', 'CCC', 'ZZZ'])
    expect(row('ZZZ').sepa).toBeNull()
    expect(row('CCC').radar).toBeNull()
    expect(row('BBB').prem).toBeNull()
  })

  it('re-cuts path and grade the way the mart does', () => {
    // AAA: composite ≈ .79 with 11/11 → PIVOT, grade A.
    expect(row('AAA').sepa?.path).toBe('PIVOT')
    expect(row('AAA').sepa?.grade).toBe('A')
    expect(row('CCC').sepa?.path).toBe('AVOID')
  })

  it('reconciles the composite at Model weights, the options tier at 50 where unscored', () => {
    for (const r of ROWS.filter((x) => x.sepa)) {
      expect(sepaScoreAt(r.sepa!, MODEL_W)).toBeCloseTo(r.sepa!.comp, 6)
    }
    const parts = sepaParts(row('BBB').sepa!, MODEL_W)
    expect(parts.reduce((a, p) => a + (p.points ?? 0), 0)).toBeCloseTo(row('BBB').sepa!.comp, 6)
    expect(parts.find((p) => p.key === 'opt')?.note).toMatch(/50/)
  })
})

describe('each model by its own bar', () => {
  it('SEPA SETUP / PIVOT · Radar A+ / A · Premium ≥ 70', () => {
    expect(clears(row('AAA'), 'm_sepa')).toBe(true)
    expect(clears(row('AAA'), 'm_radar')).toBe(true)
    expect(clears(row('AAA'), 'm_prem')).toBe(true)
    expect(barsCleared(row('AAA'))).toBe(3)
    expect(clears(row('ZZZ'), 'm_radar')).toBe(true)
    expect(clears(row('ZZZ'), 'm_sepa')).toBe(false)
    expect(clears(row('CCC'), 'm_prem')).toBe(false)
  })

  it('counts the match rate over the names that pass the other conditions', () => {
    const cells = matchRate(ROWS)
    expect(cells.map((c) => c.k)).toEqual([1, 2, 1, 1])
    expect(cells[1].covered).toBe(3)
    expect(cells.every((c) => c.of === 4)).toBe(true)
  })
})

describe('the stages', () => {
  it('reads a min stage off the pass count, not the chips', () => {
    const s: ScreenState = { on: {}, mins: { trend: 9 } }
    expect(runStages(ROWS, STAGES, s, probe).survivors.map((r) => r.sym)).toEqual(['AAA', 'BBB'])
  })

  it('requires every selected chip in a min stage', () => {
    const s: ScreenState = { on: { crs_ge_70: true }, mins: {} }
    expect(runStages(ROWS, STAGES, s, probe).survivors).toHaveLength(0)
  })

  it('agreement: picked models must all clear; a min without picks is any N of three', () => {
    expect(ROWS.filter((r) => passesAll(r, STAGES, { on: { m_sepa: true, m_radar: true }, mins: {} }, probe)).map((r) => r.sym)).toEqual(['AAA'])
    expect(ROWS.filter((r) => passesAll(r, STAGES, { on: {}, mins: { agree: 1 } }, probe)).map((r) => r.sym).sort()).toEqual(['AAA', 'ZZZ'])
  })

  it('counts before → after as a running intersection', () => {
    const { counts } = runStages(ROWS, STAGES, { on: { grade_a: true }, mins: { trend: 9 } }, probe)
    expect(counts[1]).toEqual({ before: 4, after: 2 })
    expect(counts[STAGES.findIndex((st) => st.id === 'radar')]).toEqual({ before: 2, after: 1 })
  })

  it('never lets an unloaded server set pass a name', () => {
    expect(probe(row('AAA'), 'bb_squeeze')).toBe(false)
    const withSet = rowProbe(new Map([['bb_squeeze', new Set(['AAA'])]]))
    expect(withSet(row('AAA'), 'bb_squeeze')).toBe(true)
  })

  it('opens the old screener’s address on its own criteria', () => {
    expect(LEGACY_SCREEN.mins.trend).toBe(8)
    expect(conditionCount(LEGACY_SCREEN)).toBe(1)
  })
})

describe('funnels and lineage', () => {
  it('each model funnel ends at its bar; All three at all three', () => {
    const f = funnelsOf(ROWS, ROWS)
    expect(f.map((x) => x.steps[x.steps.length - 1].set.length)).toEqual([1, 2, 1, 1])
    expect(f[3].steps[1].set).toHaveLength(4)
  })

  it('draws the picked models’ axes, or all three, and always Bars cleared', () => {
    expect(visibleAxes({ on: {}, mins: {} })).toEqual([0, 1, 2, 3])
    expect(visibleAxes({ on: { m_radar: true }, mins: {} })).toEqual([1, 3])
    expect(focusOnVisible({ 0: 1, 1: 0 }, [1, 3])).toEqual({ 1: 0 })
  })

  it('files a name the model does not cover as not rated', () => {
    expect(AXES[0].nodes[AXES[0].of(row('ZZZ'))]).toBe('not rated')
    expect(AXES[2].nodes[AXES[2].of(row('BBB'))]).toBe('not rated')
    expect(AXES[3].nodes[AXES[3].of(row('AAA'))]).toBe('3 of 3')
  })
})

describe('versions and saving', () => {
  it('says what a fork added and dropped', () => {
    const a = { v: 1, parent: -1, screen: { on: {}, mins: {} }, universe: 'all', syms: ['AAA', 'BBB'], why: 'initial', at: '' }
    const b = { ...a, v: 2, parent: 0, syms: ['AAA', 'CCC'] }
    expect(versionDiff(a, null)).toBe('root')
    expect(versionDiff(b, a)).toBe('vs v1 · +CCC  −BBB')
  })

  it('saves only what the saved-screen vocabulary can hold, and names the rest', () => {
    const ok = toSavedDefinition({ on: { price_gt_sma50: true, eps_acc_fy: true, m_sepa: true }, mins: {} }, STAGES)
    expect(ok.definition).toEqual({ q: '', paths: ['SETUP', 'PIVOT'], grades: [], min_composite: 0, tech: ['price_gt_sma50'], fund: ['eps_acc_fy'] })
    const no = toSavedDefinition({ on: { bb_squeeze: true }, mins: { trend: 8 } }, STAGES)
    expect(no.blocked).toEqual(['Trend template ≥ 8', 'BB squeeze (width < 50D avg)'])
  })
})
