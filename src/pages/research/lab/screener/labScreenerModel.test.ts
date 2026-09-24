import { describe, expect, it } from 'vitest'
import type { SepaWideRow } from '@/api/research/sepaScreenerWide'
import {
  activeFilterCount,
  condPassPct,
  EMPTY_FILTER,
  filterSummary,
  gradeOf,
  pathOf,
  screenRows,
  sortRows,
  stageOf,
  vsSma50,
} from './labScreenerModel'

function row(over: Partial<SepaWideRow>): SepaWideRow {
  return {
    symbol: 'AAA',
    eval_date: '2026-09-24',
    overall_rank: 1,
    composite_score: 0.5,
    tech_pass_count: 5,
    fund_pass_count: 3,
    company_name: 'Alpha Aviation',
    primary_exchange: 'XNAS',
    latest_close: 100,
    sma_50: 95,
    crs_percentile: 60,
    return_252d: 0.2,
    conditions: {},
    ...over,
  }
}

describe('the dbt case rules', () => {
  it('grade thresholds are the mart’s own', () => {
    expect([0.86, 0.76, 0.61, 0.46, 0.44].map(gradeOf)).toEqual(['A+', 'A', 'B', 'C', 'D'])
    // boundary values land on the higher grade — >= in the case rule
    expect([0.85, 0.75, 0.6, 0.45].map(gradeOf)).toEqual(['A+', 'A', 'B', 'C'])
  })

  it('stage needs both legs for 2A; path needs both for PIVOT', () => {
    expect(stageOf(0.7, 8)).toBe('STAGE_2A')
    expect(stageOf(0.9, 7)).toBe('STAGE_2B')
    expect(stageOf(0.56, 5)).toBe('STAGE_1')
    expect(stageOf(0.3, 2)).toBe('STAGE_4')
    expect(pathOf(0.75, 8)).toBe('PIVOT')
    expect(pathOf(0.75, 7)).toBe('SETUP')
    expect(pathOf(0.5, 2)).toBe('WATCH')
    expect(pathOf(0.3, 2)).toBe('AVOID')
  })
})

describe('condPassPct', () => {
  it('counts only evaluated rows; a null row is neither pass nor fail', () => {
    const rows = [
      row({ conditions: { crs_ge_70: true } }),
      row({ conditions: { crs_ge_70: false } }),
      row({ conditions: { crs_ge_70: null } }),
    ]
    expect(condPassPct(rows, 'crs_ge_70')).toBeCloseTo(50, 8)
    expect(condPassPct(rows, 'unknown_key')).toBeNull()
    expect(condPassPct([], 'crs_ge_70')).toBeNull()
  })
})

describe('screenRows', () => {
  const rows = [
    row({ symbol: 'AAA', composite_score: 0.8, tech_pass_count: 9, conditions: { crs_ge_70: true } }),
    row({ symbol: 'BBB', composite_score: 0.5, tech_pass_count: 4, conditions: { crs_ge_70: false }, company_name: 'Bravo' }),
    row({ symbol: 'CCC', composite_score: 0.62, tech_pass_count: 6, conditions: { crs_ge_70: null } }),
  ]

  it('q matches symbol or company, case-blind', () => {
    expect(screenRows(rows, { ...EMPTY_FILTER, q: 'bra' }).map((r) => r.symbol)).toEqual(['BBB'])
  })

  it('path and grade filters go through the derived rules', () => {
    expect(screenRows(rows, { ...EMPTY_FILTER, paths: ['PIVOT'] }).map((r) => r.symbol)).toEqual(['AAA'])
    expect(screenRows(rows, { ...EMPTY_FILTER, grades: ['B'] }).map((r) => r.symbol)).toEqual(['CCC'])
  })

  it('minScore is on the slider’s 0–100 scale', () => {
    expect(screenRows(rows, { ...EMPTY_FILTER, minScore: 60 }).map((r) => r.symbol)).toEqual(['AAA', 'CCC'])
  })

  it('a required condition treats unknown as failing — required means known true', () => {
    expect(screenRows(rows, { ...EMPTY_FILTER, tech: ['crs_ge_70'] }).map((r) => r.symbol)).toEqual(['AAA'])
  })

  it('filter bookkeeping: count and honesty line', () => {
    const f = { ...EMPTY_FILTER, q: 'x', paths: ['PIVOT'], minScore: 20, tech: ['crs_ge_70'] }
    expect(activeFilterCount(f)).toBe(4)
    expect(filterSummary(f)).toContain('path PIVOT')
    expect(filterSummary(f)).toContain('composite ≥ 20')
    expect(filterSummary(EMPTY_FILTER)).toBe('none')
  })
})

describe('sortRows', () => {
  const rows = [
    row({ symbol: 'AAA', crs_percentile: 40 }),
    row({ symbol: 'BBB', crs_percentile: null }),
    row({ symbol: 'CCC', crs_percentile: 90 }),
  ]

  it('nulls sink to the bottom in both directions', () => {
    expect(sortRows(rows, 'crs_percentile', 'desc').map((r) => r.symbol)).toEqual(['CCC', 'AAA', 'BBB'])
    expect(sortRows(rows, 'crs_percentile', 'asc').map((r) => r.symbol)).toEqual(['AAA', 'CCC', 'BBB'])
  })

  it('vs_sma50 and iv sort on derived and joined values', () => {
    const r2 = [
      row({ symbol: 'AAA', latest_close: 110, sma_50: 100 }),
      row({ symbol: 'BBB', latest_close: 90, sma_50: 100 }),
    ]
    expect(vsSma50(r2[0])).toBeCloseTo(0.1, 8)
    expect(sortRows(r2, 'vs_sma50', 'desc')[0].symbol).toBe('AAA')
    const iv = (s: string) => (s === 'BBB' ? 70 : null)
    expect(sortRows(r2, 'iv_percentile', 'desc', iv)[0].symbol).toBe('BBB')
  })
})
