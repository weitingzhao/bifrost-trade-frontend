export interface BarCoveragePeriod {
  count: number
  min_ts: number | null
  max_ts: number | null
  min_day?: string | null
  max_day?: string | null
  status?: string
}

export interface BarCoverageItem {
  symbol: string
  stock_day: BarCoveragePeriod
  stock_min: Record<string, BarCoveragePeriod>
}

export interface BarsCoverageResponse {
  coverage: BarCoverageItem[]
  policy?: {
    daily_years: number
    min_weeks: number
    '5min_months': number
    '1hour_months': number
  }
}
