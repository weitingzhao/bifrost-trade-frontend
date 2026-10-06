/**
 * Analyze Exhibit API client — Wave 15, extended by research-loop-automation A2/A5.
 *
 * One exhibit per lens and symbol: the reading, its `verdict` (band + meaning
 * from the lens registry), the lens' settled `track_record` and `similar`
 * readings' forward returns. A page verdict strip and Copilot both read this.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { requestJson } from '@/lib/http'
import {
  ExhibitSchema,
  OptionListingSchema,
} from '@/lib/schemas/research'
import type { LensBand } from '@/api/research/lenses'

export type ExhibitLens =
  | 'iv_rank'
  | 'iv_percentile'
  | 'vrp'
  | 'skew'
  | 'term_slope'
  | 'opex_pin'
  | 'gex_regime'
  | 'terrain_regime'
  | 'momentum'
  | 'sepa'
  | 'order_sentiment'
  | 'forecast_path'
  /** Wave 15 alias of terrain_regime, kept for the ribbon. */
  | 'terrain'
export type ExhibitFreshness = 'fresh' | 'stale' | 'missing'

export interface ExhibitVerdict {
  band: LensBand
  label: string
  value: unknown
  unit: string
  means: string
}

export interface ExhibitSideRecord {
  n: number
  evaluated_5d: number
  hit_rate_5d: number | null
  evaluated_20d: number
  hit_rate_20d: number | null
}

export interface ExhibitTrackRecord {
  lens: string
  window_days: number
  symbol_scoped: boolean
  n: number
  hit_rate_5d: number | null
  hit_rate_20d: number | null
  by_side: { hot: ExhibitSideRecord; cold: ExhibitSideRecord }
}

export interface ExhibitSimilar {
  lens: string
  /** The reading the k-NN matched on (research 0.136.0+) — a number, or a regime. */
  value?: number | string | null
  source: string
  horizon: number
  n: number
  n_resolved: number
  median_fwd: number | null
  p25_fwd: number | null
  p75_fwd: number | null
  share_positive: number | null
}

export interface ExhibitPayload {
  lens: ExhibitLens | string
  symbol: string
  as_of: string | null
  freshness: ExhibitFreshness
  readings: Record<string, unknown>
  history_summary: Record<string, unknown>
  caveats: string[]
  lens_id?: string | null
  verdict?: ExhibitVerdict | null
  track_record?: ExhibitTrackRecord | null
  similar?: ExhibitSimilar | null
}

const validate = withValidation<ExhibitPayload>(ExhibitSchema, 'research/exhibit')

export async function fetchExhibit(lens: ExhibitLens, symbol: string): Promise<ExhibitPayload> {
  const q = new URLSearchParams({ symbol: symbol.trim().toUpperCase() })
  const data = await requestJson<ExhibitPayload>(
    `${researchEngineUrl(`/research/exhibit/${encodeURIComponent(lens)}`)}?${q}`,
    { envelope: 'research' }
  )
  return validate(data)
}

/**
 * The batch — every lens for one symbol in one request. The server fans them
 * across a few workers on one connection each; a lens that failed comes back
 * as itself, `missing`, with a `lens failed:` caveat, so a bad lens is visible
 * rather than absent.
 */
export async function fetchExhibitComposite(
  lenses: readonly string[],
  symbol: string
): Promise<ExhibitComposite> {
  const q = new URLSearchParams({ symbol: symbol.trim().toUpperCase(), lenses: lenses.join(',') })
  const data = await requestJson<{
    symbol: string
    lenses: string[]
    exhibits: ExhibitPayload[]
    option_listing?: unknown
  }>(`${researchEngineUrl('/research/exhibit/composite')}?${q}`, { envelope: 'research' })
  return {
    exhibits: (data.exhibits ?? []).map((ex) => validate(ex)),
    // Absent before research 0.193.0: unknown, not "no options".
    optionListing: data.option_listing === undefined ? undefined : validateListing(data.option_listing),
  }
}

/**
 * The name's standard and adjusted option contracts on its latest
 * open-interest session (research 0.193.0, TD-159), counted by Research's own
 * rule (`engines/adjusted_contracts.py`). An adjusted contract is what a
 * corporate action leaves behind; Research leaves it out of every option metric.
 */
export interface OptionListing {
  as_of: string | null
  /** Null with `error` when the count failed. */
  standard_contracts: number | null
  adjusted_contracts: number | null
  /** The adjusted OCC roots (`CUE1`). */
  adjusted_roots: string[]
  error?: string
}

export interface ExhibitComposite {
  exhibits: ExhibitPayload[]
  /** Null: no open-interest rows for the name. Undefined: the server predates the field. */
  optionListing: OptionListing | null | undefined
}

const validateListing = withValidation<OptionListing | null>(
  OptionListingSchema.nullable(),
  'research/exhibit/composite option_listing',
)

/** Adjusted contracts listed and no standard one: every option metric is empty by rule. */
export function adjustedOnlyListing(l: OptionListing | null | undefined): l is OptionListing {
  return l != null && (l.adjusted_contracts ?? 0) > 0 && l.standard_contracts === 0
}

/** True when the batch stubbed this lens because its builder threw. */
export function exhibitFailed(ex: ExhibitPayload): boolean {
  return ex.freshness === 'missing' && (ex.caveats ?? []).some((c) => c.startsWith('lens failed:'))
}
