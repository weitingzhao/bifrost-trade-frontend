export function coverageDrillDownPath(hash: string): string {
  switch (hash) {
    case 'coverage-option':
      return '/settings/coverage/option'
    case 'coverage-stock':
      return '/settings/coverage/stock-ib'
    case 'coverage-massive-stock':
      return '/settings/coverage/stock-massive'
    case 'coverage-overview-detail':
      return '/settings/coverage/overview-detail'
    case 'feed-massive-stock':
      return '/settings/feed/massive-stock'
    default:
      return '/settings/coverage/overview-detail'
  }
}

export function coverageDrillDownLabel(hash: string): string {
  if (hash === 'coverage-option') return 'Option Coverage'
  if (hash === 'coverage-stock') return 'Stock — IB Live (Redis)'
  if (hash === 'coverage-massive-stock') return 'Stock — Massive Delay (DB)'
  if (hash === 'coverage-overview-detail') return 'Detail'
  if (hash === 'feed-massive-stock') return 'Feed — Massive Stock'
  return 'Open'
}
