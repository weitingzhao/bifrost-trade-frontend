export const OPTION_REST_SECTION_ORDER = [
  'contracts',
  'feed_options_aggregate',
  'feed_option_snapshots',
  'trades-quotes',
] as const

export type OptionRestSectionId = (typeof OPTION_REST_SECTION_ORDER)[number]

export const OPTION_REST_SECTION_LABELS: Record<OptionRestSectionId, string> = {
  contracts: 'Contracts',
  feed_options_aggregate: 'Aggregate Bars (OHLC)',
  feed_option_snapshots: 'Snapshots',
  'trades-quotes': 'Trade & Quotes',
}
