/** Shared coercion helpers for research API response parsing. */
export function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * A name a latest-session ranking left out (research 0.137.0): it has a reading
 * before the session the ranking is on, but none on it. `trade_date` is its
 * last reading; `reason` is the endpoint's own word for why.
 */
export interface SessionLeftOut {
  symbol: string
  trade_date: string | null
  reason: string
}

export function parseLeftOut(v: unknown): SessionLeftOut[] {
  if (!Array.isArray(v)) return []
  const out: SessionLeftOut[] = []
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const symbol = typeof r.symbol === 'string' ? r.symbol.trim().toUpperCase() : ''
    if (!symbol) continue
    out.push({
      symbol,
      trade_date: typeof r.trade_date === 'string' && r.trade_date ? r.trade_date : null,
      reason: typeof r.reason === 'string' && r.reason ? r.reason : 'unknown',
    })
  }
  return out
}
