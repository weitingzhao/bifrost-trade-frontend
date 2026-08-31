/**
 * Analyze Exhibit API client — Wave 15.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'

export type ExhibitLens = 'vrp' | 'iv_rank' | 'terrain' | 'order_sentiment'
export type ExhibitFreshness = 'fresh' | 'stale' | 'missing'

export interface ExhibitPayload {
  lens: ExhibitLens | string
  symbol: string
  as_of: string | null
  freshness: ExhibitFreshness
  readings: Record<string, unknown>
  history_summary: Record<string, unknown>
  caveats: string[]
}

export async function fetchExhibit(lens: ExhibitLens, symbol: string): Promise<ExhibitPayload> {
  const q = new URLSearchParams({ symbol: symbol.trim().toUpperCase() })
  return unwrap(
    await fetch(`${researchEngineUrl(`/research/exhibit/${encodeURIComponent(lens)}`)}?${q}`),
  )
}
