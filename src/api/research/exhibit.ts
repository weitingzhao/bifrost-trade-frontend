/**
 * Analyze Exhibit API client — Wave 15, extended by research-loop-automation A2/A5.
 *
 * One exhibit per lens and symbol: the reading, its `verdict` (band + meaning
 * from the lens registry), the lens' settled `track_record` and `similar`
 * readings' forward returns. A page verdict strip and Copilot both read this.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'
import {
  ExhibitSchema,
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
  const data = await unwrap<ExhibitPayload>(
    await fetch(`${researchEngineUrl(`/research/exhibit/${encodeURIComponent(lens)}`)}?${q}`)
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
): Promise<ExhibitPayload[]> {
  const q = new URLSearchParams({ symbol: symbol.trim().toUpperCase(), lenses: lenses.join(',') })
  const data = await unwrap<{ symbol: string; lenses: string[]; exhibits: ExhibitPayload[] }>(
    await fetch(`${researchEngineUrl('/research/exhibit/composite')}?${q}`)
  )
  return (data.exhibits ?? []).map(validate)
}

/** True when the batch stubbed this lens because its builder threw. */
export function exhibitFailed(ex: ExhibitPayload): boolean {
  return ex.freshness === 'missing' && (ex.caveats ?? []).some((c) => c.startsWith('lens failed:'))
}
