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

/**
 * One name's 8-K rows on file, all time (research 0.112.0+, only when the read
 * was narrowed with `symbol`). Zero means the feed has never carried the name —
 * which is not the same fact as "nothing filed this week".
 */
export interface NarrativeSymbolCoverage {
  symbol: string
  filings: number
  first_filed: string | null
  last_filed: string | null
}

export interface NarrativeReading {
  as_of: string | null
  window_days: number
  truncated: boolean
  sources: NarrativeSources
  /** Absent before research 0.112.0; null on a read of every name. */
  symbol_coverage?: NarrativeSymbolCoverage | null
  tags: NarrativeTag[]
  count: number
}

export interface NarrativeQuery {
  /** One name only (research 0.112.0+). */
  symbol?: string
  /** Rows the server may return before it says `truncated`; its default is 400, its cap 2000. */
  limit?: number
}

interface Envelope<T> {
  ok: boolean
  data: T
}

const validateNarrative = withValidation<Envelope<unknown>>(ResearchEnvelopeSchema, 'research/narrative')

export async function fetchNarrative(days: number, q: NarrativeQuery = {}): Promise<NarrativeReading> {
  const params = new URLSearchParams({ days: String(days) })
  if (q.symbol) params.set('symbol', q.symbol)
  if (q.limit != null) params.set('limit', String(q.limit))
  const res = await fetch(researchEngineUrl(`/research/narrative?${params.toString()}`))
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`narrative: ${res.status} ${text.slice(0, 200)}`)
  }
  return (validateNarrative(await res.json()) as Envelope<NarrativeReading>).data
}

/** A name's earnings filing dates (research `GET /research/narrative/earnings`, 0.119.0+). */
export interface EarningsDates {
  symbol: string
  /** Dates of every 8-K carrying Item 2.02, oldest first, ISO. */
  dates: string[]
  /** This name's 8-Ks on file at all — 0 means the feed never carried it, not "no earnings". */
  filings: number
  first_filed: string | null
  last_filed: string | null
}

const validateEarnings = withValidation<Envelope<unknown>>(ResearchEnvelopeSchema, 'research/narrative/earnings')

export async function fetchEarningsDates(symbol: string): Promise<EarningsDates> {
  const params = new URLSearchParams({ symbol })
  const res = await fetch(researchEngineUrl(`/research/narrative/earnings?${params.toString()}`))
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`narrative/earnings: ${res.status} ${text.slice(0, 200)}`)
  }
  return (validateEarnings(await res.json()) as Envelope<EarningsDates>).data
}
