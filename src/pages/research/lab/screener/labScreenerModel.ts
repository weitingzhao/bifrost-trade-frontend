/**
 * The Screener authoring face's vocabulary (design `Research Stock Screen
 * Method.dc.html`, route rev 2026-09-20.4): the 19 SEPA conditions in the
 * mart's own columns, the dbt case rules for grade / stage / path, and the
 * filter and sort the authoring table runs client-side over the whole
 * evaluated universe.
 *
 * Grade, stage and path are the case rules in `mart_sepa_feature_daily`,
 * re-applied at read over `mart_sepa_screener_wide` rows — verified on DEV
 * 1000/1000 against the model store's own columns before this file was
 * written (the model endpoint serves only its top 1000, the wide read serves
 * the whole universe).
 */
import type { SepaWideRow } from '@/api/research/sepaScreenerWide'

/** [mart column, label] in the design's failure order — display order too. */
export const TECH_CONDS: readonly [string, string][] = [
  ['price_gt_sma200', 'Price > SMA200'],
  ['sma150_gt_sma200', 'SMA150 > SMA200'],
  ['price_gt_sma150', 'Price > SMA150'],
  ['sma50_gt_sma200', 'SMA50 > SMA200'],
  ['avg_volume_50_gt_threshold', '50d avg volume > threshold'],
  ['close_ge_low52_x_1_3', 'Close ≥ 1.3× 52w low'],
  ['sma50_gt_sma150', 'SMA50 > SMA150'],
  ['price_gt_sma50', 'Price > SMA50'],
  ['sma200_rising_1m', 'SMA200 rising 1m'],
  ['close_ge_high52_x_0_75', 'Close ≥ 75% of 52w high'],
  ['crs_ge_70', 'CRS ≥ 70'],
]

export const FUND_CONDS: readonly [string, string][] = [
  ['eps_3y_ge_15pct', 'EPS 3y growth ≥ 15%'],
  ['rev_3y_ge_15pct', 'Revenue 3y growth ≥ 15%'],
  ['eps_q2q_ge_25pct', 'EPS q/q ≥ 25%'],
  ['rev_q2q_ge_25pct', 'Revenue q/q ≥ 25%'],
  ['eps_acc_fy', 'EPS accelerating FY'],
  ['rev_acc_fy', 'Revenue accelerating FY'],
  ['eps_acc_2q', 'EPS accelerating 2q'],
  ['rev_acc_2q', 'Revenue accelerating 2q'],
]

export const PATHS = ['PIVOT', 'SETUP', 'WATCH', 'AVOID'] as const
export const GRADES = ['A+', 'A', 'B', 'C', 'D'] as const

/* The dbt case rules (mart_sepa_feature_daily), composite as the 0–1 the
 * mart writes. */
export function gradeOf(c: number): (typeof GRADES)[number] {
  return c >= 0.85 ? 'A+' : c >= 0.75 ? 'A' : c >= 0.6 ? 'B' : c >= 0.45 ? 'C' : 'D'
}

export function stageOf(c: number, tech: number): string {
  return tech >= 8 && c >= 0.7
    ? 'STAGE_2A'
    : tech >= 6
      ? 'STAGE_2B'
      : c >= 0.55
        ? 'STAGE_1'
        : 'STAGE_4'
}

export function pathOf(c: number, tech: number): (typeof PATHS)[number] {
  return c >= 0.75 && tech >= 8 ? 'PIVOT' : c >= 0.6 ? 'SETUP' : c >= 0.45 ? 'WATCH' : 'AVOID'
}

/** Share of the evaluated universe passing one condition, in percent. */
export function condPassPct(rows: readonly SepaWideRow[], key: string): number | null {
  if (rows.length === 0) return null
  let known = 0
  let pass = 0
  for (const r of rows) {
    const v = r.conditions[key]
    if (v == null) continue
    known += 1
    if (v) pass += 1
  }
  return known > 0 ? (pass / known) * 100 : null
}

/** Price against its SMA50, as a signed fraction, or null without both. */
export function vsSma50(r: SepaWideRow): number | null {
  if (r.latest_close == null || r.sma_50 == null || r.sma_50 === 0) return null
  return (r.latest_close - r.sma_50) / r.sma_50
}

export interface ScreenFilter {
  q: string
  paths: string[]
  grades: string[]
  /** 0–100, against composite × 100 — the slider's own scale. */
  minScore: number
  tech: string[]
  fund: string[]
}

export const EMPTY_FILTER: ScreenFilter = {
  q: '',
  paths: [],
  grades: [],
  minScore: 0,
  tech: [],
  fund: [],
}

export function activeFilterCount(f: ScreenFilter): number {
  return (
    f.paths.length +
    f.grades.length +
    f.tech.length +
    f.fund.length +
    (f.minScore > 0 ? 1 : 0) +
    (f.q.trim() ? 1 : 0)
  )
}

/** The active filters, spelled out — the empty state's honesty line. */
export function filterSummary(f: ScreenFilter): string {
  const parts = [
    f.paths.length ? `path ${f.paths.join('|')}` : null,
    f.grades.length ? `grade ${f.grades.join('|')}` : null,
    f.minScore > 0 ? `composite ≥ ${f.minScore}` : null,
    f.tech.length ? `${f.tech.length} trend conditions` : null,
    f.fund.length ? `${f.fund.length} fundamental conditions` : null,
    f.q.trim() ? `"${f.q.trim()}"` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'none'
}

/** A required condition means required to be true — an unknown fails it. */
export function screenRows(rows: readonly SepaWideRow[], f: ScreenFilter): SepaWideRow[] {
  const q = f.q.trim().toLowerCase()
  return rows.filter((r) => {
    if (
      q &&
      !r.symbol.toLowerCase().includes(q) &&
      !(r.company_name ?? '').toLowerCase().includes(q)
    )
      return false
    if (f.paths.length && !f.paths.includes(pathOf(r.composite_score, r.tech_pass_count)))
      return false
    if (f.grades.length && !f.grades.includes(gradeOf(r.composite_score))) return false
    if (r.composite_score * 100 < f.minScore) return false
    if (f.tech.some((k) => r.conditions[k] !== true)) return false
    if (f.fund.some((k) => r.conditions[k] !== true)) return false
    return true
  })
}

export type SortKey =
  | 'symbol'
  | 'grade'
  | 'composite_score'
  | 'tech_pass_count'
  | 'fund_pass_count'
  | 'crs_percentile'
  | 'return_252d'
  | 'vs_sma50'
  | 'iv_percentile'

export type SortDir = 'asc' | 'desc'

/** Grade sorts by the composite behind it; nulls sink regardless of direction. */
export function sortRows(
  rows: readonly SepaWideRow[],
  key: SortKey,
  dir: SortDir,
  ivOf?: (symbol: string) => number | null,
): SepaWideRow[] {
  const sgn = dir === 'desc' ? -1 : 1
  const val = (r: SepaWideRow): string | number | null => {
    switch (key) {
      case 'symbol':
        return r.symbol
      case 'grade':
        return r.composite_score
      case 'vs_sma50':
        return vsSma50(r)
      case 'iv_percentile':
        return ivOf ? ivOf(r.symbol) : null
      default:
        return r[key]
    }
  }
  return [...rows].sort((a, b) => {
    const x = val(a)
    const y = val(b)
    if (x == null) return 1
    if (y == null) return -1
    return (x > y ? 1 : x < y ? -1 : 0) * sgn
  })
}
