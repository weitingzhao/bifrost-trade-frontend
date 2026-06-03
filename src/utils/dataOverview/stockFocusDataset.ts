export type WatchlistStocksTableId = 'stock_day' | 'stock_min'

export type StocksUtilitiesTableId = 'tickers' | 'ticker_overview' | 'ticker_types'

export type StocksFocusTableId = WatchlistStocksTableId

export type StocksFocusDataset = 'all' | 'fundamental' | WatchlistStocksTableId

export const STOCKS_WATCHLIST_FOCUS_TABLE_IDS: WatchlistStocksTableId[] = ['stock_day', 'stock_min']

export function showStocksFocusTable(focus: StocksFocusDataset, table: StocksFocusTableId): boolean {
  if (focus === 'all') return true
  if (focus === 'fundamental') return STOCKS_WATCHLIST_FOCUS_TABLE_IDS.includes(table)
  return focus === table
}
