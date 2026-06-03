export const STOCK_REST_SECTION_ORDER = [
  'stock-tickers',
  'stock-aggregates',
  'stock-snapshots',
  'stock-trades-quotes',
  'stock-corporate-actions',
  'stock-fundamentals',
  'stock-filings',
  'stock-news',
] as const

export type StockRestSectionId = (typeof STOCK_REST_SECTION_ORDER)[number]

export const STOCK_REST_SECTION_LABELS: Record<StockRestSectionId, string> = {
  'stock-tickers': 'Tickers',
  'stock-aggregates': 'Aggregate Bars (OHLC)',
  'stock-snapshots': 'Snapshots',
  'stock-trades-quotes': 'Trades & Quotes',
  'stock-corporate-actions': 'Corporate Actions',
  'stock-fundamentals': 'Fundamentals',
  'stock-filings': 'Filings & Disclosures',
  'stock-news': 'News',
}

export const STOCK_CUSTOM_BARS_DEFAULT_START_MS = 1717421400000
export const STOCK_CUSTOM_BARS_DEFAULT_END_MS = 1717444800000

export const MASSIVE_STOCKS_COVERAGE_PLAN_URL = `${import.meta.env.BASE_URL}plans/massive_stocks_api_coverage.html`
