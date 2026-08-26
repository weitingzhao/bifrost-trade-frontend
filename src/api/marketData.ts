import { marketDataPluginUrl } from '@/lib/devApiUrl'

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
  try {
    const r = await fetch(
      `${marketDataPluginUrl('/market/reference/tickers/search')}?${params.toString()}`,
      {
        credentials: 'omit',
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      },
    )
    if (!r.ok) return []
    const body = (await r.json()) as { ok?: boolean; results?: TickerHit[] }
    if (!body.ok || !Array.isArray(body.results)) return []
    return body.results
  } catch {
    return []
  }
}
