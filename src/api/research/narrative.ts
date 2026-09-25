/**
 * The narrative lens — deterministic readings over the SEC text the plugin
 * ingests (research `GET /research/narrative`).
 *
 * Every row is either an SEC item number (the filing states it) or the data
 * vendor's classification; neither carries a confidence. The model readings
 * the design also draws are owed server-side, not faked here.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { ResearchEnvelopeSchema } from '@/lib/schemas/research'

export type NarrativeBasis = 'sec' | 'vendor'

export interface NarrativeMeasured {
  trade_date: string | null
  composite: number | null
  iv_rank: number | null
}

export interface NarrativeTag {
  symbol: string
  kind: 'event'
  basis: NarrativeBasis
  /** SEC item number, for `sec` rows. */
  item: string | null
  /** The vendor's top-level category, for `vendor` rows. */
  category: string | null
  reading: string
  quote: string
  form: string
  filing_date: string
  filing_url: string | null
  accession: string
  measured: NarrativeMeasured | null
}

export interface NarrativeSources {
  filings_8k: { filings: number; names: number; first_filed: string | null; last_filed: string | null }
  vendor_classified: { filings: number; share: number | null }
  tenk: { section: string; filings: number; names: number; latest_period: string | null }[]
}

export interface NarrativeReading {
  as_of: string | null
  window_days: number
  truncated: boolean
  sources: NarrativeSources
  tags: NarrativeTag[]
  count: number
}

interface Envelope<T> {
  ok: boolean
  data: T
}

const validateNarrative = withValidation<Envelope<unknown>>(ResearchEnvelopeSchema, 'research/narrative')

export async function fetchNarrative(days: number): Promise<NarrativeReading> {
  const res = await fetch(researchEngineUrl(`/research/narrative?days=${days}`))
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`narrative: ${res.status} ${text.slice(0, 200)}`)
  }
  return (validateNarrative(await res.json()) as Envelope<NarrativeReading>).data
}
