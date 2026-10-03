import { marketDataPluginUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { requestJson } from '@/lib/http'
import { TickerSearchResponseSchema } from '@/lib/schemas/marketData'

const validateTickers = withValidation<TickerHit[]>(
  TickerSearchResponseSchema,
  'market/reference/tickers/search',
)

export interface TickerHit {
  symbol: string
  name?: string | null
  market?: string | null
  locale?: string | null
  primary_exchange?: string | null
  instrument_type?: string | null
  active?: boolean | null
}

const SEARCH_TIMEOUT_MS = 8_000

export async function fetchTickerSearch(q: string, limit = 20): Promise<TickerHit[]> {
  const needle = q.trim()
  if (!needle) return []

  const params = new URLSearchParams({ q: needle, limit: String(limit) })
  // A failure throws (TD-50 batch 4, Owner 10-03): the pickers say the search failed
  // instead of "No matches". A refusal or a 2xx `ok: false` is the plugin's reason; a
  // search slower than SEARCH_TIMEOUT_MS is aborted and says so.
  const body = await requestJson<{ ok?: boolean; results?: TickerHit[] }>(
    `${marketDataPluginUrl('/market/reference/tickers/search')}?${params.toString()}`,
    { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS), label: 'Symbol search' },
  )
  return Array.isArray(body.results) ? validateTickers(body.results) : []
}
