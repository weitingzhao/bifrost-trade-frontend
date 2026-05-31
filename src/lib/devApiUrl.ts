/**
 * Dev: same-origin paths + Vite proxy (aligned with bifrost-trader-engine vite.config).
 * Prod: full VITE_API_* base URLs.
 */

function portFromBase(base: string | undefined, fallback: number): number {
  if (!base?.trim()) return fallback
  try {
    const u = new URL(base.trim())
    return u.port ? Number(u.port) : fallback
  } catch {
    return fallback
  }
}

/** Parse listen ports from VITE_API_* for vite.config (Node only). */
export function parseDevApiPorts(env: Record<string, string>): Record<string, number> {
  return {
    monitor: portFromBase(env.VITE_API_MONITOR, 8765),
    massive: portFromBase(env.VITE_API_MASSIVE, 8766),
    docs: portFromBase(env.VITE_API_DOCS, 8767),
    ops: portFromBase(env.VITE_API_OPS, 8768),
    trading: portFromBase(env.VITE_API_TRADING, 8769),
    strategy: portFromBase(env.VITE_API_STRATEGY, 8770),
    portfolio: portFromBase(env.VITE_API_PORTFOLIO, 8771),
    market: portFromBase(env.VITE_API_MARKET, 8772),
    research: portFromBase(env.VITE_API_RESEARCH, 8773),
  }
}

function joinBase(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base.replace(/\/$/, '')}${normalizedPath}`
}

export function researchUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) return normalizedPath
  return joinBase(import.meta.env.VITE_API_RESEARCH as string, normalizedPath)
}

export function massiveUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) return normalizedPath
  return joinBase(import.meta.env.VITE_API_MASSIVE as string, normalizedPath)
}

export function opsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const withOps = normalizedPath.startsWith('/ops') ? normalizedPath : `/ops${normalizedPath}`
  if (import.meta.env.DEV) return withOps
  return joinBase(import.meta.env.VITE_API_OPS as string, withOps)
}
