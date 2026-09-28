/**
 * Is each signal still earning its keep — the design's roster, assembled.
 *
 * `Research Signal Decay.dc.html` leads with a table of every signal and an
 * amber panel above it, and the page's whole argument is one sentence in its
 * footer: **decay is judged against each signal's own 1-year average, not
 * against other signals.** A 55% signal drifting to 40% is decaying; a 45%
 * signal holding 45% is not. Every threshold here follows from that.
 *
 * ## Where the two numbers come from
 *
 * `/research/signal-decay` takes a `window_days`, so "now" and "its own 1-year
 * average" are the same endpoint asked twice — 90 days against 252. Measured
 * on DEV 2026-09-22 for `vrp hot`: 40.1% on 152 settled at 90 days, 43.7% on
 * 245 at 252. That −3.6 points is the drift, in the design's own terms.
 *
 * ## The unit is a lens *side*, not a named strategy
 *
 * The design's signals are written prose — "IV rank ≥ 60 short vol", "25Δ RR
 * reversal". This side's registry has no such objects: it has six decay lenses
 * and each fires hot or cold, which is the thing the engine actually measures
 * a hit rate for. So a row is `IV Rank · hot`, and the name is the engine's
 * rather than a label invented here to look like the design's.
 *
 * ## Profit factor
 *
 * research 0.132.0 sums it on the same settled rows the hit rate counts:
 * each 20-day forward return signed by the side's own direction (mean-revert:
 * hot expects down, cold up; follow the reverse), gains over losses. Null says
 * one of three things and the row names which — a magnitude lens (Gamma: its
 * hit is the size of a move, with no direction to pay off), nothing settled
 * yet, or no losing outcome to divide by. The design marks it under 1.2.
 */
import { THIN_SAMPLE } from '@/lib/symbolRecord'
import type {
  SignalDecayLens,
  SignalDecayResponse,
  SignalDecaySideStats,
  SignalDecayTrendPoint,
} from '@/api/research/signalDecay'

/** The design's own drift thresholds, in percentage points. */
export const DRIFT_DECAY_PTS = -5
const DRIFT_STRONG_PTS = 3

/** Under this many settled outcomes the design greys the reading out. */
export const THIN_N = 20

/** The design's profit-factor floor: under it the column reads in the loss colour. */
export const PF_FLOOR = 1.2

/** Two places, because the readings sit around 1 where one place hides the sign of the edge. */
export function fmtProfitFactor(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : v.toFixed(2)
}

/** Why a profit factor is missing, when it is. */
export type ProfitFactorGap = 'magnitude' | 'unsettled' | 'no_loss' | 'unread'

export type DecaySide = 'hot' | 'cold'

export interface DecayBar {
  /** 0–1, or null when that week was too thin to read. */
  value: number | null
  label: string
  /** More than five points under the 1-year average. */
  weak: boolean
}

export interface DecayRow {
  key: string
  lens: SignalDecayLens
  lensLabel: string
  side: DecaySide
  /** `IV Rank · hot` — the engine's unit, named as the engine names it. */
  name: string
  /** 20-day hit rate over the recent window, or null when nothing settled. */
  hit: number | null
  /** The same over a year — this signal's own average, the design's baseline. */
  avg: number | null
  /** Percentage points of drift against that average. */
  driftPts: number | null
  /** Settled 20-day outcomes the recent reading rests on. */
  n: number
  /** 20-day profit factor over the recent window, on this side's direction. */
  pf: number | null
  /** Why `pf` is null; null when it is a reading. */
  pfGap: ProfitFactorGap | null
  bars: DecayBar[]
  /** True when the drift clears the design's decay threshold. */
  decaying: boolean
  /** One line, in the reader's words. */
  read: string
}

export interface LensPair {
  lens: SignalDecayLens
  label: string
  /**
   * The registry's `hit_rule` is `magnitude`: no direction, so no profit factor.
   * Undefined until the registry has loaded — a null then cannot be told apart.
   */
  magnitude?: boolean
  now: SignalDecayResponse | null
  year: SignalDecayResponse | null
}

function sideOf(data: SignalDecayResponse | null, side: DecaySide): SignalDecaySideStats | null {
  return data?.by_side?.[side] ?? null
}

function trendOf(data: SignalDecayResponse | null, side: DecaySide): SignalDecayTrendPoint[] {
  const raw = side === 'hot' ? data?.trend_hot : data?.trend_cold
  return Array.isArray(raw) ? raw : []
}

/** Twenty-six weeks is the design's six months, in the unit the trend uses. */
const TREND_WEEKS = 26

function bars(points: readonly SignalDecayTrendPoint[], avg: number | null): DecayBar[] {
  return points.slice(-TREND_WEEKS).map((p) => {
    const thin = (p.n ?? 0) < THIN_SAMPLE
    const value = thin ? null : (p.rolling_hit_rate_5d ?? null)
    return {
      value,
      label: thin ? `${p.week} · n ${p.n ?? 0} — too thin to read` : `${p.week} · ${Math.round((value ?? 0) * 100)}% on ${p.n}`,
      weak: value != null && avg != null && value < avg - 0.05,
    }
  })
}

/**
 * The row's one line.
 *
 * Written from the numbers rather than stored, and it says which of the three
 * things is true: the reading is too thin to be one, the signal is drifting
 * below its own average, or it is holding.
 */
function hitReadOf(hit: number | null, avg: number | null, driftPts: number | null, n: number): string {
  if (hit == null || n === 0) return 'Nothing has settled at 20 days yet — the window has not closed.'
  if (n < THIN_SAMPLE) return `Only ${n} settled — too thin to call a rate, let alone a drift.`
  if (driftPts == null || avg == null) return 'No year-long average to compare against yet.'
  if (driftPts <= DRIFT_DECAY_PTS) {
    return `${Math.abs(driftPts)} points under its own 1-year average — decaying by the design's rule.`
  }
  if (driftPts >= DRIFT_STRONG_PTS) return 'Running above its own average.'
  return n < THIN_N ? `Holding, but on only ${n} settled.` : 'Holding its own average.'
}

/**
 * The hit line, and the payoff when it says something the rate does not: a
 * signal can hold its hit rate and still give back more than it makes.
 */
function readOf(hit: number | null, avg: number | null, driftPts: number | null, n: number, pf: number | null): string {
  const line = hitReadOf(hit, avg, driftPts, n)
  if (pf == null || n < THIN_SAMPLE) return line
  if (pf < 1) return `${line} Its 20-day profit factor is ${fmtProfitFactor(pf)} — it gave back more than it made.`
  if (pf < PF_FLOOR) return `${line} Profit factor ${fmtProfitFactor(pf)}, under the design's ${PF_FLOOR} floor.`
  return line
}

function pfGapOf(pair: LensPair, side: SignalDecaySideStats | null): ProfitFactorGap | null {
  if (pair.magnitude) return 'magnitude'
  if (!side) return null
  if (side.profit_factor_20d != null) return null
  if ((side.evaluated_20d ?? 0) === 0) return 'unsettled'
  // Absent before research 0.132.0; null with settled rows is no loss, once the
  // registry has said the lens is not a magnitude one.
  return side.profit_factor_20d === undefined || pair.magnitude === undefined ? 'unread' : 'no_loss'
}

export function decayRoster(pairs: readonly LensPair[]): DecayRow[] {
  const rows: DecayRow[] = []
  for (const p of pairs) {
    for (const side of ['hot', 'cold'] as const) {
      const now = sideOf(p.now, side)
      const year = sideOf(p.year, side)
      const hit = now?.hit_rate_20d ?? null
      const avg = year?.hit_rate_20d ?? null
      const n = now?.evaluated_20d ?? 0
      const driftPts =
        hit != null && avg != null ? Math.round((hit - avg) * 100) : null
      const pf = p.magnitude ? null : (now?.profit_factor_20d ?? null)
      rows.push({
        key: `${p.lens}:${side}`,
        lens: p.lens,
        lensLabel: p.label,
        side,
        name: `${p.label} · ${side}`,
        hit,
        avg,
        driftPts,
        n,
        pf,
        pfGap: pfGapOf(p, now),
        bars: bars(trendOf(p.year, side), avg),
        // A drift is only a decay when there is enough behind it to be one.
        decaying: driftPts != null && driftPts <= DRIFT_DECAY_PTS && n >= THIN_SAMPLE,
        read: readOf(hit, avg, driftPts, n, pf),
      })
    }
  }
  // Worst drift first: the page exists to surface what is slipping.
  return rows.sort((a, b) => (a.driftPts ?? 999) - (b.driftPts ?? 999))
}

export interface DecayAlert {
  key: string
  name: string
  why: string
}

/** The amber panel: one line per decaying signal, with its arithmetic. */
export function decayAlerts(rows: readonly DecayRow[]): DecayAlert[] {
  return rows
    .filter((r) => r.decaying)
    .map((r) => ({
      key: r.key,
      name: r.name,
      why: `20d hit ${Math.round((r.hit ?? 0) * 100)}% on ${r.n} settled — ${Math.abs(r.driftPts ?? 0)} points under its 1-year ${Math.round((r.avg ?? 0) * 100)}%`,
    }))
}
