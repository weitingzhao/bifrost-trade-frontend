export interface ExecutionFreshnessItem {
  account_id: string
  source: string
  latest_exec_ts: number | null
  days_since_latest: number | null
}

export interface ExecutionsFreshnessResponse {
  items: ExecutionFreshnessItem[]
}

export interface TwsFetchResponse {
  ok: boolean
  count: number
  fetched_total: number
  message: string
  error?: string
}

export interface FlexFetchPerQuery {
  role: string
  query_id: string
  label: string
  rows: number
  data_from?: string
  data_to?: string
}

export interface FlexFetchResponse {
  ok: boolean
  count: number
  raw_count?: number
  data_from?: string | null
  data_to?: string | null
  range_from?: string | null
  range_to?: string | null
  updated_accounts?: number
  last_flex_date_after?: string | null
  per_query?: FlexFetchPerQuery[]
  message?: string
  error?: string
}

export interface FlexUploadResponse {
  ok: boolean
  count: number
  message?: string
  error?: string
}
