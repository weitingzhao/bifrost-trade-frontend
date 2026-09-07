/**
 * The C2 depth lines — what each lab says once its exhibit carries more than a
 * band (research-loop-automation C2).
 *
 * Pure text builders over exhibit readings, so the hub views and the tests
 * read the same sentence from the same numbers.
 */
import type { ExhibitPayload } from '@/api/research/exhibit'
import type { VolSurfaceResidualRow } from '@/api/research/volSurface'
import type { LensBand } from '@/api/research/lenses'

function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function pctText(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`
}

function signedPctText(fraction: number, digits = 1): string {
  const pct = fraction * 100
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(digits)}%`
}

function ordinal(n: number): string {
  const r = Math.round(n)
  const mod100 = r % 100
  if (mod100 >= 11 && mod100 <= 13) return `${r}th`
  const mod10 = r % 10
  return `${r}${mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th'}`
}

/* ------------------------------------------------------------------ skew */

/** "91st percentile of its own year (120 days)" — or null before there is a year. */
export function skewPercentileText(readings: Record<string, unknown> | undefined): string | null {
  const pctile = finiteOrNull(readings?.slope_pctile_252d)
  if (pctile == null) return null
  const days = finiteOrNull(readings?.history_days)
  const where = pctile < 1 ? 'bottom of its own year' : pctile > 99 ? 'top of its own year' : `${ordinal(pctile)} percentile of its own year`
  return `${where}${days != null ? ` (${days} days)` : ''}`
}

export interface TermStructureView {
  label: 'backwardation' | 'contango' | 'flat'
  /** near − far ATM vol, as a fraction. */
  backwardation: number
  nearVol: number | null
  farVol: number | null
  nearDte: number | null
  farDte: number | null
  line: string
}

/** The term-structure reading of the term_slope exhibit, or null without two expiries. */
export function termStructureView(exhibit: ExhibitPayload | undefined): TermStructureView | null {
  const r = exhibit?.readings
  const back = finiteOrNull(r?.backwardation)
  const label = r?.term_structure
  if (back == null || (label !== 'backwardation' && label !== 'contango' && label !== 'flat')) return null
  const nearVol = finiteOrNull(r?.near_vol)
  const farVol = finiteOrNull(r?.far_vol)
  const nearDte = finiteOrNull(r?.near_dte)
  const farDte = finiteOrNull(r?.far_dte)
  const word = label === 'backwardation' ? 'Backwardation' : label === 'contango' ? 'Contango' : 'Flat term'
  const legs =
    nearVol != null && farVol != null
      ? ` — near ${pctText(nearVol)}${nearDte != null ? ` (${nearDte}d)` : ''} vs far ${pctText(farVol)}${farDte != null ? ` (${farDte}d)` : ''}`
      : ''
  const pts = `${back >= 0 ? '+' : '−'}${(Math.abs(back) * 100).toFixed(1)} pts`
  return { label, backwardation: back, nearVol, farVol, nearDte, farDte, line: `${word} ${pts}${legs}` }
}

export interface StrikeResidual {
  strike: number
  z: number
  ivMarket: number | null
  ivFitted: number | null
}

/** ±30% of spot — beyond that the fit has few quotes and its residuals are noise, not mispricing. */
export const STRIKE_PICK_MAX_ABS_LOG_MONEYNESS = 0.35

/**
 * The strikes priced furthest above (rich) and below (cheap) the SVI fit.
 *
 * A premium seller wants the rich ones; a buyer the cheap ones. Only rows a
 * full z away count — inside that the "mispricing" is the fit's own noise —
 * and only strikes near enough to spot to be tradeable wings.
 */
export function richCheapStrikes(
  rows: readonly VolSurfaceResidualRow[],
  {
    limit = 3,
    minAbsZ = 1,
    maxAbsLogMoneyness = STRIKE_PICK_MAX_ABS_LOG_MONEYNESS,
  }: { limit?: number; minAbsZ?: number; maxAbsLogMoneyness?: number } = {},
): { rich: StrikeResidual[]; cheap: StrikeResidual[] } {
  const usable: StrikeResidual[] = []
  for (const r of rows) {
    if (r.strike == null || r.residual_z == null || !Number.isFinite(r.residual_z)) continue
    if (r.log_moneyness != null && Math.abs(r.log_moneyness) > maxAbsLogMoneyness) continue
    if (Math.abs(r.residual_z) < minAbsZ) continue
    usable.push({ strike: r.strike, z: r.residual_z, ivMarket: r.iv_market, ivFitted: r.iv_fitted })
  }
  const rich = usable.filter((s) => s.z > 0).sort((a, b) => b.z - a.z).slice(0, limit)
  const cheap = usable.filter((s) => s.z < 0).sort((a, b) => a.z - b.z).slice(0, limit)
  return { rich, cheap }
}

/* ------------------------------------------------------------------ opex */

/** "Pin magnet 230 (1.9% away) · pinned 4 of 24 cycles (17%)" — or null without a strike. */
export function pinMagnetLine(exhibit: ExhibitPayload | undefined): string | null {
  const r = exhibit?.readings
  const strike = finiteOrNull(r?.max_pain_strike)
  if (strike == null) return null
  // pin_pct_distance is unsigned; the direction comes from strike vs close.
  const distance = finiteOrNull(r?.pin_pct_distance)
  const close = finiteOrNull(r?.close)
  const side = close == null || close === strike ? 'from' : strike < close ? 'below' : 'above'
  const away = distance == null ? '' : ` (${pctText(Math.abs(distance))} ${side} spot)`
  const h = exhibit?.history_summary
  const cycles = finiteOrNull(h?.cycles) ?? 0
  const rate = finiteOrNull(h?.pin_rate)
  const record =
    cycles > 0 && rate != null
      ? ` · pinned ${finiteOrNull(h?.pinned) ?? Math.round(rate * cycles)} of ${cycles} cycles (${pctText(rate, 0)})`
      : ' · no settled cycles yet'
  return `Pin magnet ${strike}${away}${record}`
}

/* ------------------------------------------------------------------- gex */

/**
 * "RV20 24.1% vs IV30 33.7% (VRP 21st pctl) — realised vol is where positive
 * gamma says it should be" — the realised-vol half of the gamma claim.
 */
export function vrpLinkLine(exhibit: ExhibitPayload | undefined): string | null {
  const r = exhibit?.readings
  const link = r?.vrp_link
  if (!link || typeof link !== 'object') return null
  const l = link as Record<string, unknown>
  const rv = finiteOrNull(l.rv_20d)
  const iv = finiteOrNull(l.atm_iv_30d)
  if (rv == null || iv == null) return null
  const pctile = finiteOrNull(l.vrp_pct_252d)
  const regime = typeof r?.regime === 'string' ? r.regime : null
  const consistent = l.consistent
  const claim =
    regime === 'positive'
      ? 'positive gamma should keep realised below implied'
      : regime === 'negative'
        ? 'negative gamma lets realised run over implied'
        : null
  const verdict =
    consistent === true
      ? 'realised vol sits where the regime says'
      : consistent === false
        ? 'realised vol contradicts the regime'
        : null
  return [
    `RV20 ${pctText(rv)} vs IV30 ${pctText(iv)}${pctile != null ? ` (VRP ${ordinal(pctile)} pctl)` : ''}`,
    verdict,
    claim,
  ]
    .filter(Boolean)
    .join(' — ')
}

/**
 * The daily dealer levels the verdict is judged on — shown next to the intraday
 * snapshot so the strip carries the same numbers as the Daily Brief's GEX card.
 */
export function dailyLevelSignals(exhibit: ExhibitPayload | undefined): { label: string; value: string }[] {
  const r = exhibit?.readings
  const zero = finiteOrNull(r?.zero_gamma)
  if (zero == null) return []
  const put = finiteOrNull(r?.major_put_wall)
  const call = finiteOrNull(r?.major_call_wall)
  const out = [{ label: 'Daily zero-γ', value: zero.toFixed(0) }]
  if (put != null && call != null) out.push({ label: 'Daily walls', value: `${put.toFixed(0)} / ${call.toFixed(0)}` })
  if (exhibit?.as_of) out.push({ label: 'As of', value: exhibit.as_of })
  return out
}

/* ------------------------------------------------------------------- vrp */

/** "Own record: VRP ≥ 80 → 20d median +1.4%, 58% positive (n=12) · ≤ 20 → …" */
export function fwd20Line(exhibit: ExhibitPayload | undefined): string | null {
  const bands = exhibit?.history_summary?.fwd20_by_band
  if (!bands || typeof bands !== 'object') return null
  const b = bands as Record<string, unknown>
  const side = (key: 'hot' | 'cold', label: string): string | null => {
    const s = b[key]
    if (!s || typeof s !== 'object') return null
    const rec = s as Record<string, unknown>
    const n = finiteOrNull(rec.n) ?? 0
    if (n === 0) return `${label} → no settled readings`
    const median = finiteOrNull(rec.median_fwd)
    const share = finiteOrNull(rec.share_positive)
    return `${label} → 20d median ${median != null ? signedPctText(median) : '—'}${share != null ? `, ${pctText(share, 0)} positive` : ''} (n=${n})`
  }
  const settled = (['hot', 'cold'] as const).some((k) => {
    const s = b[k]
    return !!s && typeof s === 'object' && (finiteOrNull((s as Record<string, unknown>).n) ?? 0) > 0
  })
  if (!settled) {
    const days = finiteOrNull(exhibit?.history_summary?.days)
    return `Own 20d record: no settled readings at either VRP extreme yet${days != null ? ` (${days} days of history)` : ''}`
  }
  const parts = [side('hot', 'VRP ≥ 80'), side('cold', 'VRP ≤ 20')].filter(Boolean)
  return parts.length ? `Own record: ${parts.join(' · ')}` : null
}

/* -------------------------------------------------------------- iv radar */

export interface LensHitSide {
  n: number
  evaluated_5d: number
  hit_rate_5d: number | null
  evaluated_20d: number
  hit_rate_20d: number | null
}

export type LensHitBySymbol = Record<string, Partial<Record<'hot' | 'cold', LensHitSide>>>

/** Which side of the lens an IV Radar bucket sits on; neutral has no record to show. */
export function sideForBucket(bucket: string): 'hot' | 'cold' | null {
  if (bucket === 'high') return 'hot'
  if (bucket === 'low') return 'cold'
  return null
}

/** "62% / 43% (n=22)" for the row's side, "—" when nothing settled. */
export function hitCellText(records: LensHitBySymbol | undefined, symbol: string, bucket: string): string {
  const side = sideForBucket(bucket)
  if (!side) return '—'
  const rec = records?.[symbol.toUpperCase()]?.[side]
  if (!rec || rec.n === 0) return '—'
  const r5 = rec.hit_rate_5d != null ? pctText(rec.hit_rate_5d, 0) : '—'
  const r20 = rec.hit_rate_20d != null ? pctText(rec.hit_rate_20d, 0) : '—'
  return `${r5} / ${r20} (n=${rec.n})`
}

/* -------------------------------------------------------------- scenario */

export interface CalibrationRow {
  regime: string
  n: number
  hits: number
  hit_rate: number | null
  avg_top_prob: number | null
  calibration_gap: number | null
  avg_close_miss_pct: number | null
}

/**
 * "Paths in range regimes hit 62% of the time against 58% claimed (n=13)" —
 * the reliability the invalidation line should be read with.
 */
export function calibrationLine(rows: readonly CalibrationRow[] | undefined, regime: string | null | undefined): string | null {
  if (!rows || !regime) return null
  const row = rows.find((r) => r.regime.toLowerCase() === regime.toLowerCase())
  if (!row || row.n === 0 || row.hit_rate == null) return null
  const claimed = row.avg_top_prob != null ? ` against ${pctText(row.avg_top_prob, 0)} claimed` : ''
  return `Paths in ${row.regime} regimes hit ${pctText(row.hit_rate, 0)} of the time${claimed} (n=${row.n})`
}

export function bandFromScore(value: number | null): LensBand | null {
  if (value == null) return null
  if (value >= 80) return 'hot'
  if (value >= 60) return 'lean_hot'
  if (value <= 20) return 'cold'
  if (value <= 40) return 'lean_cold'
  return 'neutral'
}
