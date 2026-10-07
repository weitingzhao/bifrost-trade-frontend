/** IV Radar — underlying vol regime (Wave A). */

export type IvRadarUniverseFilter = 'all' | 'benchmarks' | 'watchlist' | 'holdings'

export type IvRadarSource = 'benchmark' | 'watchlist' | 'holdings'

/** Bucket by IV Rank on the registry bands: High = hot (>= 80) / Low = cold (<= 20) / Neutral otherwise. */
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
  /** `no_data` both when the plugin has no row and when the read failed — see `readFailed`. */
  bucket: IvRadarBucket
  /** The read failed (not absent): the error's message. Null when the plugin answered. */
  readFailed: string | null
}
