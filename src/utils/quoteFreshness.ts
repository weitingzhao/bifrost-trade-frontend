export type QuoteFreshness = 'fresh' | 'stale' | 'very-stale'

/** Quote age → Symbol cell freshness: under 3s normal, 3–10s gray, over 10s darker. */
export function getQuoteFreshness(ts: number | null | undefined): QuoteFreshness | null {
  if (ts == null || !Number.isFinite(ts)) return null
  const ageSec = Date.now() / 1000 - ts
  if (ageSec < 3) return 'fresh'
  if (ageSec <= 10) return 'stale'
  return 'very-stale'
}

export function quoteFreshnessTitle(freshness: QuoteFreshness | null): string | undefined {
  if (freshness == null) return undefined
  if (freshness === 'fresh') return 'Last update <3s ago'
  if (freshness === 'stale') return 'Last update 3–10s ago'
  return 'Last update >10s ago'
}
