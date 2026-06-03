export interface TickerReferenceSearchRow {
  tickers_id: number
  ticker: string
  symbol: string
  name: string | null
  exchange: string | null
  primary_exchange: string | null
  instrument_type: string | null
  active: boolean | null
}
