/**
 * History — what today's numbers look like against their own past.
 *
 * Built 2026-09-23 against `Research History.dc.html` (Rev 2026-09-17.1). The
 * page recomputes denominators rather than producing an object anybody names
 * again, which is why the census says it owes no store. What it does owe is
 * honesty about how much past there is, and that is most of this module.
 *
 * ## How much past there is (measured on DEV 2026-09-23)
 *
 * ```
 * RV20        251 sessions   the vrp store's whole depth — a year
 * IV30        ~3 months      PLTR: 72 points, continuous from July;
 *                            AMD: 11 points, from 2026-09-08
 * RV cone     488 sessions   two years of daily closes, five horizons
 * ```
 *
 * So the design's `2y` window has a year of realised vol and a season of
 * implied, and drawing it as though the line simply ran flat before July would
 * be a claim about the market. Every figure here therefore carries the count it
 * was taken over, and the percentile is withheld below `MIN_IV_POINTS`.
 *
 * ## And some of that past is faults (measured the same day)
 *
 * The store's IV30 swings between impossible values through June and July —
 * PLTR reads 0.074, then 2.256, then 0.544 on three consecutive sessions; 2.642
 * sits between 0.566 and 0.040. NVDA, RKLB and HIMS carry the same shape; from
 * August the series settles. A percentile over those readings ranks the faults,
 * so the page names each suspect reading and withholds the percentile and the
 * band while any sit in the window. It does not drop or repair them — that
 * would be this page defining clean IV30 a second time; the store owns it.
 *
 * Moved from `pages/research/analyze/history/historyModel.ts` when the Method
 * face became its second reader (§14.2, module-placement): two features, one
 * model.
 */
import type { VrpRow } from '@/api/research/vrp'
import { quantile } from '@/utils/reviewHabits'

export type HistoryWindow = '3m' | '6m' | '1y' | '2y'

/** Trading sessions each window asks for — the design's own table. */
export const WINDOW_SESSIONS: Record<HistoryWindow, number> = {
  '3m': 63,
  '6m': 126,
  '1y': 252,
  '2y': 504,
}

export const HISTORY_WINDOWS: readonly HistoryWindow[] = ['3m', '6m', '1y', '2y']

export function isHistoryWindow(v: string | null | undefined): v is HistoryWindow {
  return v != null && (HISTORY_WINDOWS as readonly string[]).includes(v)
}

/**
 * Fewer IV readings than this and the window has no percentile to state.
 * A rank over eleven days (AMD on DEV) is a number, but not one about the
 * name's past.
 */
export const MIN_IV_POINTS = 20

/** Below this, an equity's 30-day implied vol is a reconstruction fault, not a reading. */
export const IV_FLOOR = 0.05
/** A reading this many times above (or below) both neighbours is a spike, not a move. */
export const SPIKE_RATIO = 1.8

/**
 * IV30 readings that are faults in the store rather than the market: below
 * `IV_FLOOR`, or `SPIKE_RATIO` away from both IV-bearing neighbours in the same
 * direction. An edge reading has one neighbour and is judged on the floor only
 * — today's value cannot be called a spike until tomorrow says so.
 */
export function suspectIvDates(rows: readonly VrpRow[]): string[] {
  const pts = rows.filter(
    (r) => r.trade_date != null && r.atm_iv_30d != null && Number.isFinite(r.atm_iv_30d)
  )
  const out: string[] = []
  pts.forEach((r, i) => {
    const v = r.atm_iv_30d as number
    const prev = i > 0 ? (pts[i - 1].atm_iv_30d as number) : null
    const next = i < pts.length - 1 ? (pts[i + 1].atm_iv_30d as number) : null
    const spike =
      prev != null &&
      next != null &&
      ((v > SPIKE_RATIO * prev && v > SPIKE_RATIO * next) ||
        (v * SPIKE_RATIO < prev && v * SPIKE_RATIO < next))
    if (v < IV_FLOOR || spike) out.push(r.trade_date as string)
  })
  return out
}

/** The newest `win` sessions, oldest first. The store answers newest-last. */
export function windowRows(rows: readonly VrpRow[], win: HistoryWindow): VrpRow[] {
  const dated = rows
    .filter((r) => r.trade_date != null)
    .slice()
    .sort((a, b) => (a.trade_date! < b.trade_date! ? -1 : a.trade_date! > b.trade_date! ? 1 : 0))
  return dated.slice(-WINDOW_SESSIONS[win])
}

export interface IvReading {
  asOf: string | null
  /** The newest row's readings, as the store wrote them — none recomputed. */
  iv30: number | null
  rv20: number | null
  vrp20: number | null
  /** Sessions the window asked for, sessions the store had, and IV30 points among them. */
  wanted: number
  sessions: number
  ivPoints: number
  /** The first IV30 reading in the window — where the implied line actually starts. */
  ivFrom: string | null
  /**
   * Share of the window's IV30 readings at or below today's, 0–100. The
   * design's definition: a percentile, not `iv_rank` (position between the
   * extremes). Null below `MIN_IV_POINTS`, or when today has no IV30.
   */
  percentile: number | null
  /** The IV30 20th–80th percentile over the window, for the band. */
  band: { lo: number; hi: number } | null
  /** Share of days, among those holding both, where IV30 sat above RV20. */
  ivAboveRv: number | null
  /** Days holding both, which is `ivAboveRv`'s denominator. */
  bothPoints: number
  /** IV30 readings in the window that look like store faults — see `suspectIvDates`. */
  suspects: string[]
}

export function ivReading(rows: readonly VrpRow[], win: HistoryWindow): IvReading {
  const w = windowRows(rows, win)
  const last = w.length > 0 ? w[w.length - 1] : null
  const ivs = w.map((r) => r.atm_iv_30d).filter((v): v is number => v != null && Number.isFinite(v))
  const sorted = ivs.slice().sort((a, b) => a - b)
  const firstIv = w.find((r) => r.atm_iv_30d != null)
  const today = last?.atm_iv_30d ?? null

  const both = w.filter((r) => r.atm_iv_30d != null && r.rv_20d != null)
  const above = both.filter((r) => (r.atm_iv_30d as number) > (r.rv_20d as number)).length

  // Judged over the whole series so a window's first reading still has the
  // neighbour before it; reported for the window only.
  const inWindow = new Set(w.map((r) => r.trade_date))
  const suspects = suspectIvDates(rows).filter((d) => inWindow.has(d))

  const enough = ivs.length >= MIN_IV_POINTS && suspects.length === 0
  // The shared interpolated quantile, not the prototype's floor index: the
  // band moves by a fraction of a vol point between the two, and one
  // definition of a percentile in the app is worth more than that.
  const lo = enough ? quantile(ivs, 0.2) : null
  const hi = enough ? quantile(ivs, 0.8) : null

  return {
    asOf: last?.trade_date ?? null,
    iv30: today,
    rv20: last?.rv_20d ?? null,
    vrp20: last?.vrp_20d ?? null,
    wanted: WINDOW_SESSIONS[win],
    sessions: w.length,
    ivPoints: ivs.length,
    ivFrom: firstIv?.trade_date ?? null,
    percentile:
      enough && today != null
        ? Math.round((sorted.filter((v) => v <= today).length / sorted.length) * 100)
        : null,
    band: lo != null && hi != null ? { lo, hi } : null,
    ivAboveRv: both.length > 0 && suspects.length === 0 ? above / both.length : null,
    bothPoints: both.length,
    suspects,
  }
}

/** The suspect readings in one sentence, or null when there are none. */
export function suspectLine(r: IvReading): string | null {
  const n = r.suspects.length
  if (n === 0) return null
  const shown = r.suspects
    .slice(0, 6)
    .map((d) => d.slice(5))
    .join(', ')
  const more = n > 6 ? ` and ${n - 6} more` : ''
  return (
    `${n} IV30 reading${n === 1 ? '' : 's'} in this window look${n === 1 ? 's' : ''} like faults in the store ` +
    `rather than the market — below ${Math.round(IV_FLOOR * 100)} vol, or ${SPIKE_RATIO}× away from both ` +
    `neighbours (${shown}${more}). The percentile, the band and the IV-over-RV share are withheld rather ` +
    `than taken over them.`
  )
}

/**
 * What the window is short of, in one sentence — or null when it is whole.
 *
 * Two shortfalls, told apart because they have different causes: the store
 * holding fewer sessions than the window asks (a depth question about the vrp
 * store), and IV30 starting inside the window (the option history is young).
 */
export function coverageLine(r: IvReading): string | null {
  const parts: string[] = []
  if (r.sessions < r.wanted) {
    parts.push(`the store holds ${r.sessions} of the ${r.wanted} sessions this window asks for`)
  }
  if (r.ivPoints < r.sessions) {
    parts.push(
      r.ivPoints === 0
        ? 'IV30 has no readings in it'
        : `IV30 covers ${r.ivPoints} of those sessions, from ${r.ivFrom}`
    )
  }
  if (parts.length === 0) return null
  const s = parts.join('; ')
  return s.charAt(0).toUpperCase() + s.slice(1) + '.'
}

/** Vol points from a fraction: 0.464 → "46.4". */
export function volPts(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : (v * 100).toFixed(1)
}

/** A signed spread in vol points: -0.041 → "−4.1". */
export function signedVolPts(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const x = v * 100
  return `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)}`
}

// ── the vol cone ──────────────────────────────────────────────────────────

export interface TermPoint {
  /** Calendar days to expiry. */
  dte: number
  /** ATM implied vol, as a fraction. */
  iv: number
}

/**
 * Today's ATM IV at a horizon, interpolated between the two listed expiries
 * around it in total variance (σ²·t), which is how a term structure is read.
 *
 * Null outside the listed range: a horizon shorter than the nearest expiry or
 * longer than the farthest has no pair to interpolate between, and an
 * extrapolated dot on a cone would look exactly like a measured one.
 */
export function ivAtTenor(points: readonly TermPoint[], days: number): number | null {
  const pts = points
    .filter((p) => p.dte > 0 && Number.isFinite(p.iv) && p.iv > 0)
    .slice()
    .sort((a, b) => a.dte - b.dte)
  if (pts.length === 0) return null
  const exact = pts.find((p) => p.dte === days)
  if (exact) return exact.iv
  const hiIdx = pts.findIndex((p) => p.dte > days)
  if (hiIdx <= 0) return null
  const a = pts[hiIdx - 1]
  const b = pts[hiIdx]
  const va = a.iv * a.iv * a.dte
  const vb = b.iv * b.iv * b.dte
  const v = va + ((vb - va) * (days - a.dte)) / (b.dte - a.dte)
  return v > 0 ? Math.sqrt(v / days) : null
}

// The cone's row moved to the drawing when the Method face became its second
// reader (§14.2); re-exported so this model's callers keep one import path.
export type { ConePlace, ConeRow } from '@/components/research/VolCone'
import type { ConePlace, ConeRow } from '@/components/research/VolCone'

export function conePlace(iv: number | null, p50: number | null, p80: number | null): ConePlace {
  if (iv == null || p50 == null || p80 == null) return 'unread'
  if (iv > p80) return 'above-p80'
  if (iv > p50) return 'above-median'
  return 'below-median'
}

export function coneRows(
  tenors: readonly {
    days: number
    n: number
    p05: number | null
    p20: number | null
    p50: number | null
    p80: number | null
    p95: number | null
  }[],
  term: readonly TermPoint[]
): ConeRow[] {
  return tenors.map((t) => {
    const ivToday = ivAtTenor(term, t.days)
    return {
      days: t.days,
      p05: t.p05,
      p20: t.p20,
      p50: t.p50,
      p80: t.p80,
      p95: t.p95,
      n: t.n,
      ivToday,
      place: conePlace(ivToday, t.p50, t.p80),
    }
  })
}

/**
 * The cone in one sentence, counted rather than characterised.
 *
 * The design's prose names a front-month premium; that is one reading of one
 * cone. This says how many horizons sit where, which is true of any cone, and
 * leaves the characterisation to the reader who can see it.
 */
export function coneStory(rows: readonly ConeRow[]): string {
  const read = rows.filter((r) => r.place !== 'unread')
  if (read.length === 0) {
    return 'No horizon has a listed expiry on both sides of it today, so implied vol is not placed on the cone.'
  }
  const overMedian = read.filter((r) => r.place !== 'below-median')
  const over80 = read.filter((r) => r.place === 'above-p80')
  const days = (xs: readonly ConeRow[]) => xs.map((r) => `${r.days}d`).join(', ')
  const lead =
    overMedian.length === 0
      ? `Today's implied vol sits at or below the median realised vol at all ${read.length} horizons it reaches`
      : `Today's implied vol sits above the median realised vol at ${overMedian.length} of ${read.length} horizons`
  const tail =
    over80.length > 0 ? `, and above the 80th percentile at ${over80.length} (${days(over80)})` : ''
  const missing = rows.length - read.length
  const gap =
    missing > 0
      ? ` ${missing} horizon${missing === 1 ? ' has' : 's have'} no listed expiry around ${missing === 1 ? 'it' : 'them'} and ${missing === 1 ? 'is' : 'are'} left unplaced.`
      : ''
  return `${lead}${tail}.${gap}`
}
