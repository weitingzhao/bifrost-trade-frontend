export interface QuoteItem {
  symbol?: string
  contract_key?: string
  last: number | null
  bid: number | null
  ask: number | null
  timestamp?: number | null
}

export interface QuotesResponse {
  quotes: QuoteItem[]
}

export interface DailyBenchmark {
  bar_time: number | null
  close: number | null
  prev_close: number | null
  is_today: boolean
  is_stale: boolean
}

export interface BenchmarkResponse {
  benchmarks: Record<string, DailyBenchmark>
}
