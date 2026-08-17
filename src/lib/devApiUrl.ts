function joinBase(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base.replace(/\/$/, '')}${normalizedPath}`
}

/**
 * Domain URL helpers — return Vite-proxy-relative paths in DEV,
 * full VITE_API_* URLs in production.
 *
 * In DEV the browser fetches `/api/{domain}/…` which is proxied by
 * vite.config.ts to the K3s ingress (or local compose). This avoids
 * cross-origin issues when the K3s LAN IP is unreachable from the
 * Electron/browser webview.
 *
 * Backend route prefixes (e.g. `/research/…`, `/ops/…`) are part of the
 * service path and must be included in `path` by callers.
 */

function domainUrl(domain: string, envVar: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) return `/api/${domain}${normalizedPath}`
  return joinBase(envVar, normalizedPath)
}

export function monitorUrl(path: string): string {
  return domainUrl('monitor', import.meta.env.VITE_API_MONITOR as string, path)
}

export function marketUrl(path: string): string {
  return domainUrl('market', import.meta.env.VITE_API_MARKET as string, path)
}

export function tradingUrl(path: string): string {
  return domainUrl('trading', import.meta.env.VITE_API_TRADING as string, path)
}

export function strategyUrl(path: string): string {
  return domainUrl('strategy', import.meta.env.VITE_API_STRATEGY as string, path)
}

export function portfolioUrl(path: string): string {
  return domainUrl('portfolio', import.meta.env.VITE_API_PORTFOLIO as string, path)
}

export function docsUrl(path: string): string {
  return domainUrl('docs', import.meta.env.VITE_API_DOCS as string, path)
}

export function researchUrl(path: string): string {
  return domainUrl('research', import.meta.env.VITE_API_RESEARCH as string, path)
}

export function opsUrl(path: string): string {
  return domainUrl('ops', import.meta.env.VITE_API_OPS as string, path)
}

/**
 * Market Data Plugin via platform-api proxy.
 * DEV: same-origin `/api/plugin/market-data/…` → Vite proxy → platform-api :8780
 * PROD: full VITE_API_MARKET_DATA_PLUGIN URL
 */
export function marketDataPluginUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) return `/api/plugin/market-data${normalizedPath}`
  const base =
    (import.meta.env.VITE_API_MARKET_DATA_PLUGIN as string | undefined)?.trim() ||
    'http://localhost:8780/api/v1/plugins/market-data/api'
  return joinBase(base, normalizedPath)
}
