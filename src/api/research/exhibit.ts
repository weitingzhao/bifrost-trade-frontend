/**
 * Analyze Exhibit API client — Wave 15.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'

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

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as Envelope<T> & { detail?: string }
  if (!res.ok || body.ok === false) {
    const msg = body.error ?? body.detail ?? `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
  return body.data
}

export async function fetchExhibit(lens: ExhibitLens, symbol: string): Promise<ExhibitPayload> {
  const q = new URLSearchParams({ symbol: symbol.trim().toUpperCase() })
  return unwrap(
    await fetch(`${researchEngineUrl(`/research/exhibit/${encodeURIComponent(lens)}`)}?${q}`),
  )
}
