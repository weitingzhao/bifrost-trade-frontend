/**
 * From an exhibit's band to what a lab shows — tone, label, the two evidence
 * lines. The number that decided the band lives in the lens registry (A1);
 * nothing here compares a reading to a threshold.
 *
 * Tone is the one presentation decision kept on this side: which colour a band
 * deserves depends on what the reader does with it, and this reader sells
 * premium against stock. Rich vol is an edge, a gamma regime that chases moves
 * is a risk, calm skew frees structures.
 */
import type { LensBand } from '@/api/research/lenses'
import type { ExhibitPayload, ExhibitSimilar, ExhibitTrackRecord } from '@/api/research/exhibit'
import type { AnalyzeVerdictTone } from '@/components/research/AnalyzeVerdictStrip'

type ToneMap = Partial<Record<LensBand, AnalyzeVerdictTone>>
type LabelMap = Partial<Record<LensBand, string>>

const EDGE_WHEN_HOT: ToneMap = { hot: 'success', lean_hot: 'warning', neutral: 'neutral', lean_cold: 'warning', cold: 'danger' }
const RISK_WHEN_HOT: ToneMap = { hot: 'danger', lean_hot: 'warning', neutral: 'success', lean_cold: 'success', cold: 'success' }

const TONES: Record<string, ToneMap> = {
  iv_rank: EDGE_WHEN_HOT,
  iv_percentile: EDGE_WHEN_HOT,
  vrp: EDGE_WHEN_HOT,
  momentum: EDGE_WHEN_HOT,
  sepa: EDGE_WHEN_HOT,
  order_sentiment: { hot: 'success', cold: 'danger', neutral: 'warning' },
  skew: RISK_WHEN_HOT,
  gex_regime: { hot: 'danger', cold: 'success' },
  term_slope: RISK_WHEN_HOT,
  terrain_regime: { hot: 'danger', lean_hot: 'warning', neutral: 'success' },
  opex_pin: { hot: 'warning', neutral: 'neutral' },
}

const LABELS: Record<string, LabelMap> = {
  iv_rank: {
    hot: 'Sell premium bias',
    lean_hot: 'Leaning rich — wait for VRP',
    neutral: 'No edge — stay flat',
    lean_cold: 'Leaning cheap — wait for confirmation',
    cold: 'Buy premium bias',
  },
  iv_percentile: { hot: 'Rich vs its year', neutral: 'Mid-range', cold: 'Cheap vs its year' },
  vrp: {
    hot: 'Sell-vol edge',
    lean_hot: 'Leaning sell-vol',
    neutral: 'No VRP edge — flat',
    lean_cold: 'Leaning buy-vol',
    cold: 'Buy-vol edge',
  },
  // C2: skew is a percentile of the symbol's own year, so every band has a name.
  skew: {
    hot: 'Skew extreme for this name — size wings carefully',
    lean_hot: 'Skew elevated for this name — prefer defined risk',
    neutral: 'Skew normal for this name — structure freer',
    lean_cold: 'Skew low for this name — wings cheap',
    cold: 'Skew at its floor — wings cheapest, structures freest',
  },
  term_slope: { hot: 'Backwardation — front loaded', neutral: 'Normal term curve', cold: 'Steep contango — calendars pay' },
  gex_regime: { hot: 'Negative gamma — dealers chase', cold: 'Positive gamma — dealers damp' },
  terrain_regime: { hot: 'Crash-risk — do not add', lean_hot: 'Trending — wait for confirmation', neutral: 'Range — fade extremes' },
  opex_pin: { hot: 'Pin magnet within 1%', neutral: 'Not near the pin' },
  order_sentiment: { hot: 'Lean long with flow', cold: 'Lean short with flow', neutral: 'Mixed tape — fade extremes' },
  momentum: { hot: 'Momentum wants to release', neutral: 'Momentum mid-pack', cold: 'Momentum exhausted' },
  sepa: { hot: 'SEPA setup', neutral: 'SEPA mid-pack', cold: 'SEPA avoid' },
}

const BAND_WORD: Record<LensBand, string> = {
  hot: 'hot',
  lean_hot: 'lean hot',
  neutral: 'neutral',
  lean_cold: 'lean cold',
  cold: 'cold',
}

export function toneForBand(lensId: string, band: LensBand | null | undefined): AnalyzeVerdictTone {
  if (!band) return 'neutral'
  return TONES[lensId]?.[band] ?? 'neutral'
}

export function labelForBand(lensId: string, band: LensBand | null | undefined, missing = 'No reading — wait'): string {
  if (!band) return missing
  return LABELS[lensId]?.[band] ?? `${BAND_WORD[band][0].toUpperCase()}${BAND_WORD[band].slice(1)}`
}

/** The auto-insight chip has no neutral state; a neutral verdict reads as info. */
export function chipTone(tone: AnalyzeVerdictTone): 'success' | 'danger' | 'warning' | 'info' {
  return tone === 'neutral' ? 'info' : tone
}

export interface VerdictView {
  band: LensBand | null
  tone: AnalyzeVerdictTone
  label: string
  /** The registry's one-sentence meaning of the band, or the exhibit's first caveat. */
  means: string | null
  /** True when the band is a trigger side — the chip-worthy states. */
  decisive: boolean
}

/** The view of an exhibit's verdict a lab renders; safe to call with no data yet. */
export function verdictView(
  lensId: string,
  exhibit: ExhibitPayload | undefined,
  opts: { missing?: string } = {},
): VerdictView {
  const band = (exhibit?.verdict?.band ?? null) as LensBand | null
  return {
    band,
    tone: toneForBand(lensId, band),
    label: labelForBand(lensId, band, opts.missing),
    means: exhibit?.verdict?.means ?? exhibit?.caveats?.[0] ?? null,
    decisive: band === 'hot' || band === 'cold',
  }
}

/** Severity band from the registry's own bands — for tables that grade many rows at once. */
export function bandForSeverity(
  bands: { hot: number | null; lean_hot: number | null } | undefined,
  abs: number | null | undefined,
): LensBand | null {
  if (!bands || abs == null || !Number.isFinite(abs)) return null
  if (bands.hot != null && abs >= bands.hot) return 'hot'
  if (bands.lean_hot != null && abs >= bands.lean_hot) return 'lean_hot'
  return 'neutral'
}

function pctText(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`
}

function signedPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

/** "hot side hit 5d 62% · 20d 43% (n=13, this symbol)" — or null when nothing settled. */
export function trackRecordLine(tr: ExhibitTrackRecord | null | undefined, band: LensBand | null): string | null {
  if (!tr || tr.n === 0) return null
  const side = band === 'cold' || band === 'lean_cold' ? 'cold' : 'hot'
  const s = tr.by_side[side]
  const scope = tr.symbol_scoped ? 'this symbol' : 'all symbols'
  if (s.n === 0) return `${side} side: no triggers in ${tr.window_days}d (${scope})`
  return `${side} side hit 5d ${pctText(s.hit_rate_5d)} · 20d ${pctText(s.hit_rate_20d)} (n=${s.n}, ${scope}, ${tr.window_days}d)`
}

/** "similar readings: median +2.6% over 5d, 60% positive (n=5)" — or null. */
export function similarLine(sim: ExhibitSimilar | null | undefined): string | null {
  if (!sim || sim.n_resolved === 0) return null
  return `similar readings: median ${signedPct(sim.median_fwd)} over ${sim.horizon}d, ${pctText(sim.share_positive)} positive (n=${sim.n_resolved})`
}
