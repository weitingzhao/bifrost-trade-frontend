import type { QuotesResponse, BenchmarkResponse } from '@/types/market'

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
