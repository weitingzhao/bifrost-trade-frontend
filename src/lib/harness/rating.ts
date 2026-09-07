/**
 * The Bifrost Rating as the memo reads it.
 *
 * The rating is computed once, on the run, by a rule the Owner chose (option A,
 * 2026-09-07): a letter for the setup, stars for how much backs it, a verb for
 * what to do, price levels beside it, and an outlook. This module only parses
 * and formats. It must never recompute a grade or a level: two copies of the
 * rule would drift, and the whole point of a deterministic rating is that
 * `candidate_outcome` can grade the grade.
 */
import type { HarnessTrace } from '@/lib/harness/harnessTrace'
import { numberOrNull } from '@/lib/harness/harnessTrace'

export type RatingAction = 'buy_zone' | 'extended' | 'accumulate' | 'watch' | 'hold_no_add' | 'avoid'
export type RatingZone = 'in_zone' | 'below_pivot' | 'extended' | 'unknown'
export type RatingOutlook = 'improving' | 'stable' | 'softening'

export interface RatingLevels {
  pivot: number
  entry_lo: number
  entry_hi: number
  stop: number
  stop_source: string
  risk_pct: number
  target_2r: number
  target_3r: number
  rr: number
}

export interface RatingTiming {
  pct_vs_pivot: number | null
  pct_vs_50d: number | null
  zone: RatingZone
  above_50d: boolean | null
}

export interface RatingInstrument {
  stage_row: string | null
  iv_col: string | null
  iv_rank: number | null
  suggestion: string | null
  note: string
}

export interface RatingBasis {
  path: string | null
  components: Record<string, number | null>
  checks_passed: Record<string, number | null>
  close: number | null
  sma_50: number | null
  sma_200: number | null
  low_52w: number | null
  high_52w: number | null
  invalidation: string[]
}

export interface CandidateRating {
  symbol: string
  grade: string | null
  grade_score: number | null
  stage: string | null
  conviction: number
  conviction_reason: string
  action: RatingAction
  action_label: string
  action_reason: string
  levels: RatingLevels | null
  timing: RatingTiming
  outlook: RatingOutlook | null
  score_drift: { from: number; to: number; delta: number } | null
  instrument: RatingInstrument
  inputs: {
    net: string
    agreement: string | null
    validate: string
    portfolio: string
    blocked: boolean
    hit_rate: number | null
    judged: number
  }
  basis: RatingBasis | null
  why: string
}

const ACTIONS = new Set<RatingAction>(['buy_zone', 'extended', 'accumulate', 'watch', 'hold_no_add', 'avoid'])
const ZONES = new Set<RatingZone>(['in_zone', 'below_pivot', 'extended', 'unknown'])

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function text(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function numMap(v: unknown): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [k, x] of Object.entries(rec(v))) out[k] = numberOrNull(x)
  return out
}

export function parseRating(raw: unknown): CandidateRating | null {
  const r = rec(raw)
  const symbol = text(r.symbol)
  if (!symbol) return null
  const action = text(r.action)
  const levels = rec(r.levels)
  const timing = rec(r.timing)
  const inst = rec(r.instrument)
  const inputs = rec(r.inputs)
  const drift = rec(r.score_drift)
  const basis = r.basis ? rec(r.basis) : null
  const zone = text(timing.zone)
  const outlook = text(r.outlook)
  const hasLevels = numberOrNull(levels.entry_lo) != null && numberOrNull(levels.stop) != null
  return {
    symbol: symbol.toUpperCase(),
    grade: text(r.grade),
    grade_score: numberOrNull(r.grade_score),
    stage: text(r.stage),
    conviction: Math.max(0, Math.min(5, Math.round(numberOrNull(r.conviction) ?? 0))),
    conviction_reason: String(r.conviction_reason ?? ''),
    action: action && ACTIONS.has(action as RatingAction) ? (action as RatingAction) : 'watch',
    action_label: String(r.action_label ?? action ?? '—'),
    action_reason: String(r.action_reason ?? ''),
    levels: hasLevels
      ? {
          pivot: numberOrNull(levels.pivot) ?? 0,
          entry_lo: numberOrNull(levels.entry_lo) ?? 0,
          entry_hi: numberOrNull(levels.entry_hi) ?? 0,
          stop: numberOrNull(levels.stop) ?? 0,
          stop_source: String(levels.stop_source ?? ''),
          risk_pct: numberOrNull(levels.risk_pct) ?? 0,
          target_2r: numberOrNull(levels.target_2r) ?? 0,
          target_3r: numberOrNull(levels.target_3r) ?? 0,
          rr: numberOrNull(levels.rr) ?? 2,
        }
      : null,
    timing: {
      pct_vs_pivot: numberOrNull(timing.pct_vs_pivot),
      pct_vs_50d: numberOrNull(timing.pct_vs_50d),
      zone: zone && ZONES.has(zone as RatingZone) ? (zone as RatingZone) : 'unknown',
      above_50d: typeof timing.above_50d === 'boolean' ? timing.above_50d : null,
    },
    outlook:
      outlook === 'improving' || outlook === 'stable' || outlook === 'softening' ? outlook : null,
    score_drift:
      numberOrNull(drift.from) != null && numberOrNull(drift.to) != null
        ? {
            from: numberOrNull(drift.from) ?? 0,
            to: numberOrNull(drift.to) ?? 0,
            delta: numberOrNull(drift.delta) ?? 0,
          }
        : null,
    instrument: {
      stage_row: text(inst.stage_row),
      iv_col: text(inst.iv_col),
      iv_rank: numberOrNull(inst.iv_rank),
      suggestion: text(inst.suggestion),
      note: String(inst.note ?? ''),
    },
    inputs: {
      net: String(inputs.net ?? 'abstain'),
      agreement: text(inputs.agreement),
      validate: String(inputs.validate ?? 'abstain'),
      portfolio: String(inputs.portfolio ?? 'abstain'),
      blocked: inputs.blocked === true,
      hit_rate: numberOrNull(inputs.hit_rate),
      judged: Math.round(numberOrNull(inputs.judged) ?? 0),
    },
    basis: basis
      ? {
          path: text(basis.path),
          components: numMap(basis.components),
          checks_passed: numMap(basis.checks_passed),
          close: numberOrNull(basis.close),
          sma_50: numberOrNull(basis.sma_50),
          sma_200: numberOrNull(basis.sma_200),
          low_52w: numberOrNull(basis.low_52w),
          high_52w: numberOrNull(basis.high_52w),
          invalidation: Array.isArray(basis.invalidation)
            ? (basis.invalidation as unknown[]).map((x) => String(x))
            : [],
        }
      : null,
    why: String(r.why ?? ''),
  }
}

/** The run's ratings, in the order the run ranked them (best first). */
export function traceRatings(trace: HarnessTrace): CandidateRating[] {
  const ev = trace.events.find((e) => e.step === 'rate')
  if (!ev || !Array.isArray(ev.ratings)) return []
  return (ev.ratings as unknown[]).map(parseRating).filter((r): r is CandidateRating => r !== null)
}

export function actionTone(action: RatingAction): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  switch (action) {
    case 'buy_zone':
      return 'success'
    case 'accumulate':
      return 'info'
    case 'extended':
    case 'hold_no_add':
      return 'warning'
    case 'avoid':
      return 'danger'
    default:
      return 'neutral'
  }
}

/** "★★☆☆☆" — five glyphs so the eye reads position, not a count. */
export function stars(n: number): string {
  const k = Math.max(0, Math.min(5, Math.round(n)))
  return '★'.repeat(k) + '☆'.repeat(5 - k)
}

export function fmtPx(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n >= 100 ? n.toFixed(2) : n.toFixed(2)
}

export function fmtPct(n: number | null | undefined, signed = true): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const s = `${Math.abs(n).toFixed(1)}%`
  if (!signed) return s
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s
}

export interface RatingSummary {
  total: number
  best: number
  byAction: Partial<Record<RatingAction, number>>
  split: number
  blocked: number
}

export function summarize(ratings: CandidateRating[]): RatingSummary {
  const byAction: Partial<Record<RatingAction, number>> = {}
  let best = 0
  let split = 0
  let blocked = 0
  for (const r of ratings) {
    byAction[r.action] = (byAction[r.action] ?? 0) + 1
    best = Math.max(best, r.conviction)
    if (r.inputs.agreement === 'dissent') split += 1
    if (r.inputs.blocked || r.inputs.validate === 'oppose') blocked += 1
  }
  return { total: ratings.length, best, byAction, split, blocked }
}

/**
 * The sentence at the top of the memo.
 *
 * It says the outcome first — how many are actionable, or that none are — then
 * the two reasons a reader can act on: judges split, validate blocked. Written
 * from the ratings, so it cannot disagree with the deck beneath it.
 */
export function memoHeadline(ratings: CandidateRating[], considered: number | null): string {
  const s = summarize(ratings)
  if (s.total === 0) return 'No candidates were rated.'
  const from = considered != null ? ` from ${considered.toLocaleString('en-US')}` : ''
  const actionable = (s.byAction.buy_zone ?? 0) + (s.byAction.accumulate ?? 0)
  const head =
    actionable > 0
      ? `${s.total} candidate${s.total === 1 ? '' : 's'}${from}. ${actionable} actionable, best ${stars(s.best).replace(/☆+$/, '')}.`
      : `${s.total} candidate${s.total === 1 ? '' : 's'}${from}. None above ${stars(s.best).replace(/☆+$/, '') || '☆'} — nothing actionable yet.`
  const reasons: string[] = []
  if (s.split > 0) reasons.push(`judges split on ${s.split}`)
  if (s.blocked > 0) reasons.push(`validate blocked ${s.blocked}`)
  return reasons.length ? `${head} ${reasons.join(', ')}.` : head
}
