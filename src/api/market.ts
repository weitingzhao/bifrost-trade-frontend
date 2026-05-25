import type { QuoteItem, QuotesResponse, BenchmarkResponse, WatchlistResponse, OpenOrder } from '@/types/market'

const BASE = import.meta.env.VITE_API_MARKET as string

export async function fetchQuotes(
  symbols: string[],
  contractKeys: string[] = []
): Promise<QuotesResponse> {
  const params = new URLSearchParams()
  if (symbols.length > 0) params.set('symbols', symbols.join(','))
  if (contractKeys.length > 0) params.set('contract_keys', contractKeys.join(','))
  const res = await fetch(`${BASE}/quotes?${params}`)
  if (!res.ok) throw new Error(`Market /quotes: ${res.status}`)
  return res.json() as Promise<QuotesResponse>
}

export async function fetchBenchmarks(symbols: string[]): Promise<BenchmarkResponse> {
  const params = new URLSearchParams({ symbols: symbols.join(',') })
  const res = await fetch(`${BASE}/bars/benchmark?${params}`)
  if (!res.ok) throw new Error(`Market /bars/benchmark: ${res.status}`)
  return res.json() as Promise<BenchmarkResponse>
}

export async function fetchWatchlist(): Promise<WatchlistResponse> {
  const res = await fetch(`${BASE}/watchlist`)
  if (!res.ok) throw new Error(`Market /watchlist: ${res.status}`)
  return res.json() as Promise<WatchlistResponse>
}

export async function postWatchlistItem(item: {
  contract_key: string
  symbol?: string
  sec_type?: string
  optionable?: boolean | null
  source?: string
  category_id?: number | null
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) throw new Error(`Market POST /watchlist: ${res.status}`)
  return res.json()
}

export async function deleteWatchlistItem(contractKey: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/watchlist?contract_key=${encodeURIComponent(contractKey)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Market DELETE /watchlist: ${res.status}`)
  return res.json()
}

function parseQuoteFromSSE(raw: string): QuoteItem | null {
  try {
    const d = JSON.parse(raw)
    return {
      symbol: d.symbol ?? undefined,
      contract_key: d.contract_key ?? undefined,
      last: d.last ?? null,
      bid: d.bid ?? null,
      ask: d.ask ?? null,
      mid: d.mid ?? null,
      ts: d.ts ?? undefined,
      timestamp: d.ts ?? undefined,
      change: d.change ?? null,
      sec_type: d.sec_type ?? null,
      expiry: d.expiry ?? null,
      strike: d.strike ?? null,
      option_right: d.option_right ?? null,
    }
  } catch {
    return null
  }
}

export function subscribeQuotes(onQuote: (q: QuoteItem) => void): () => void {
  const url = `${BASE}/quotes/stream`
  const es = new EventSource(url)
  es.onmessage = (e) => {
    const q = parseQuoteFromSSE(e.data)
    if (q) onQuote(q)
  }
  return () => es.close()
}

const MONITOR_BASE = import.meta.env.VITE_API_MONITOR as string

export async function fetchOpenOrders(): Promise<OpenOrder[]> {
  const res = await fetch(`${MONITOR_BASE}/open-orders`)
  if (!res.ok) throw new Error(`Monitor /open-orders: ${res.status}`)
  const data = await res.json()
  return data.orders ?? data.items ?? data ?? []
}
