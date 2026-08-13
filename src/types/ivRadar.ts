/** IV Radar — underlying vol regime (Wave A). */

export type IvRadarUniverseFilter = 'all' | 'benchmarks' | 'watchlist' | 'holdings'

export type IvRadarSource = 'benchmark' | 'watchlist' | 'holdings'

/** Bucket by IV Rank: High >60 / Neutral 30–60 / Low <30. */
export type IvRadarBucket = 'high' | 'neutral' | 'low' | 'no_data'

export interface IvPercentileRow {
  symbol: string
  trade_date: string | null
  iv_current: number | null
  iv_percentile_1y: number | null
  iv_rank_1y: number | null
  lookback_days: number | null
  computed_at?: string | null
}

export interface IvRadarUniverseItem {
  symbol: string
  sources: IvRadarSource[]
}

export interface IvRadarRow extends IvRadarUniverseItem {
  data: IvPercentileRow | null
  bucket: IvRadarBucket
}
