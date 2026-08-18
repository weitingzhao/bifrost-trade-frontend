function joinBase(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (!base || base === '/') return normalizedPath
  return `${base.replace(/\/$/, '')}${normalizedPath}`
}

/**
 * Single Trade API base (Phase B Wave B1).
 *
 * DEV: browser always fetches `/api/{domain}/…` (Vite proxy → K3s / nginx).
 * PROD: `VITE_API_BASE` + `/api/{domain}` + path.
 *   - empty / unset → same-origin `/api/{domain}/…` (nginx / Traefik)
 *   - absolute URL → e.g. `http://host:30882/api/{domain}/…`
 *
 * Backend route prefixes (e.g. `/research/…`, `/ops/…`) remain part of `path`.
 */

function tradeApiBase(): string {
  return (import.meta.env.VITE_API_BASE as string | undefined)?.trim() ?? ''
}

/** Origin for a Trade API domain (no trailing path beyond `/api/{domain}`). */
export function domainOrigin(domain: string): string {
  if (import.meta.env.DEV) return `/api/${domain}`
  return joinBase(tradeApiBase(), `/api/${domain}`)
}

function domainUrl(domain: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${domainOrigin(domain)}${normalizedPath}`
}

export function monitorUrl(path: string): string {
  return domainUrl('monitor', path)
}

export function marketUrl(path: string): string {
  return domainUrl('market', path)
}

export function tradingUrl(path: string): string {
  return domainUrl('trading', path)
}

export function strategyUrl(path: string): string {
  return domainUrl('strategy', path)
}

export function portfolioUrl(path: string): string {
  return domainUrl('portfolio', path)
}

export function docsUrl(path: string): string {
  return domainUrl('docs', path)
}

export function researchUrl(path: string): string {
  return domainUrl('research', path)
}

export function opsUrl(path: string): string {
  return domainUrl('ops', path)
}

/**
 * Market Data Plugin (same-origin preferred).
 *
 * DEV: `/api/plugin/market-data/…` → Vite proxy → platform-api / plugin API
 * PROD/STG (empty VITE_API_MARKET_DATA_PLUGIN): same path → Trade Traefik
 *   strip → market-data-api:8790 (plugin-market-data)
 * Escape hatch: absolute VITE_API_MARKET_DATA_PLUGIN still supported.
 */
export function marketDataPluginUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) return `/api/plugin/market-data${normalizedPath}`
  const base = (import.meta.env.VITE_API_MARKET_DATA_PLUGIN as string | undefined)?.trim() ?? ''
  if (!base || base === '/') return `/api/plugin/market-data${normalizedPath}`
  return joinBase(base, normalizedPath)
}

/**
 * IB Flex Query Plugin (same-origin preferred).
 *
 * DEV: `/api/plugin/flex-query/…` → Vite proxy → Trade gateway / Plugin API
 * PROD/STG (empty VITE_API_FLEX_QUERY_PLUGIN): same path → Trade Traefik
 *   strip → flex-query-api:8791 (plugin-flex-query)
 * Escape hatch: absolute VITE_API_FLEX_QUERY_PLUGIN still supported.
 */
export function flexQueryPluginUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) return `/api/plugin/flex-query${normalizedPath}`
  const base = (import.meta.env.VITE_API_FLEX_QUERY_PLUGIN as string | undefined)?.trim() ?? ''
  if (!base || base === '/') return `/api/plugin/flex-query${normalizedPath}`
  return joinBase(base, normalizedPath)
}
