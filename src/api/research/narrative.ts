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
import { EarningsBatchSchema, ResearchEnvelopeSchema } from '@/lib/schemas/research'
import { requestJson } from '@/lib/http'

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
  const body = await requestJson<unknown>(researchEngineUrl(`/research/narrative?${params.toString()}`), {
    label: 'narrative',
  })
  return (validateNarrative(body) as Envelope<NarrativeReading>).data
}

/**
 * The next print, estimated (research 0.125.0): the feed has no forward
 * calendar, so it is the same quarter's print a year earlier plus 52 weeks.
 */
export interface ExpectedEarnings {
  date: string
  basis: string
  /** The print a year earlier the estimate stands on. */
  from: string
  /** Calendar days from today (New York); below zero, the print is late. */
  days_away: number
  /** The rule's record on this name's own prints. */
  track: { n: number; median_miss_days: number | null; max_miss_days: number | null }
}

/** A name's earnings filing dates (research `GET /research/narrative/earnings`, 0.119.0+). */
export interface EarningsDates {
  symbol: string
  /** Dates of the 8-Ks carrying Item 2.02 that are results releases, oldest first, ISO. */
  dates: string[]
  /** Item 2.02 filings that are not results releases (0.123.0). */
  set_aside?: { filed: string; release: string | null; reason: string }[]
  /** Null when the name has no quarterly cadence to estimate from (0.125.0). */
  expected_next?: ExpectedEarnings | null
  /** This name's 8-Ks on file at all — 0 means the feed never carried it, not "no earnings". */
  filings: number
  first_filed: string | null
  last_filed: string | null
}

const validateEarnings = withValidation<Envelope<unknown>>(ResearchEnvelopeSchema, 'research/narrative/earnings')

export async function fetchEarningsDates(symbol: string): Promise<EarningsDates> {
  const params = new URLSearchParams({ symbol })
  const body = await requestJson<unknown>(researchEngineUrl(`/research/narrative/earnings?${params.toString()}`), {
    label: 'narrative/earnings',
  })
  return (validateEarnings(body) as Envelope<EarningsDates>).data
}

/** Names per batch call — research's `EARNINGS_BATCH_MAX`. */
export const EARNINGS_BATCH_MAX = 500

const validateEarningsBatch = withValidation<Record<string, EarningsDates>>(
  EarningsBatchSchema,
  'research/narrative/earnings/batch',
)

/**
 * The earnings reading for many names in one request (research 0.193.0,
 * TD-158): each name maps to exactly what `fetchEarningsDates` answers. At most
 * `EARNINGS_BATCH_MAX` names; `useNamesEarnings` splits longer lists.
 */
export async function fetchEarningsDatesBatch(symbols: readonly string[]): Promise<Record<string, EarningsDates>> {
  const params = new URLSearchParams({ symbols: symbols.join(',') })
  const body = await requestJson<unknown>(researchEngineUrl(`/research/narrative/earnings/batch?${params.toString()}`), {
    label: 'narrative/earnings/batch',
  })
  return validateEarningsBatch((validateEarnings(body) as Envelope<unknown>).data)
}
