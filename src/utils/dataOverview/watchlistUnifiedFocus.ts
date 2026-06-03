import { OPTIONS_FOCUS_TABLE_IDS, type OptionsFocusDataset, type OptionsFocusTableId } from '@/utils/dataOverview/optionFocusDataset'
import {
  STOCKS_WATCHLIST_FOCUS_TABLE_IDS,
  type StocksFocusDataset,
  type StocksFocusTableId,
} from '@/utils/dataOverview/stockFocusDataset'

export type WatchlistTableSelection = OptionsFocusTableId | StocksFocusTableId

export type WatchlistUnifiedDataset = WatchlistTableSelection | null

const OPTIONS_ID_SET = new Set<string>(OPTIONS_FOCUS_TABLE_IDS)
const STOCKS_ID_SET = new Set<string>(STOCKS_WATCHLIST_FOCUS_TABLE_IDS)

export function watchlistUnifiedShowsOptionsMatrix(u: WatchlistUnifiedDataset): boolean {
  return u != null && OPTIONS_ID_SET.has(u)
}

export function watchlistUnifiedShowsStocksMatrix(u: WatchlistUnifiedDataset): boolean {
  return u != null && STOCKS_ID_SET.has(u)
}

export function unifiedFocusToOptions(u: WatchlistUnifiedDataset): OptionsFocusDataset {
  if (u == null) return 'all'
  if (OPTIONS_ID_SET.has(u)) return u as OptionsFocusDataset
  return 'all'
}

export function unifiedFocusToStocks(u: WatchlistUnifiedDataset): StocksFocusDataset {
  if (u == null) return 'all'
  if (STOCKS_ID_SET.has(u)) return u as StocksFocusDataset
  return 'all'
}

export function optionsFocusDatasetToUnified(v: OptionsFocusDataset): WatchlistUnifiedDataset {
  if (v === 'all' || v === 'fundamental' || v === 'staging' || v === 'report') return null
  return v as OptionsFocusTableId
}

export function stocksFocusDatasetToUnified(v: StocksFocusDataset): WatchlistUnifiedDataset {
  if (v === 'all' || v === 'fundamental') return null
  return v as StocksFocusTableId
}
