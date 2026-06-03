/** Scroll / hash targets aligned with Legacy Settings → Feed → Massive. */

export function feedMassiveOptionSvcAnchorId(serviceId: string): string {
  return `feed-massive-svc-${serviceId}`
}

export function feedMassiveStockSvcAnchorId(serviceId: string): string {
  return `feed-massive-stock-svc-${serviceId}`
}

export function feedMassiveCommonSvcAnchorId(serviceId: string): string {
  return `feed-massive-common-svc-${serviceId}`
}

export const MASSIVE_OVERVIEW_BASE = '/settings/feed/massive'

export const MASSIVE_STOCK_BASE = '/settings/feed/massive-stock'
export const MASSIVE_OPTION_BASE = '/settings/feed/massive-option'
export const MASSIVE_COMM_BASE = '/settings/feed/massive-comm'

export function massiveStockCapTo(path: string, anchorId: string): string {
  return `${path}#${anchorId}`
}

export function parseHashAnchor(hash: string): string {
  return hash.startsWith('#') ? hash.slice(1) : hash
}

export function isMassiveFeedPath(pathname: string): boolean {
  return (
    pathname === MASSIVE_STOCK_BASE ||
    pathname === MASSIVE_OPTION_BASE ||
    pathname === MASSIVE_COMM_BASE ||
    pathname === MASSIVE_OVERVIEW_BASE
  )
}
