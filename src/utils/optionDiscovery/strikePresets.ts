export const STRIKE_COUNT_OPTIONS = [4, 6, 8, 19, 30, 'all'] as const
export type StrikeCountOption = (typeof STRIKE_COUNT_OPTIONS)[number]

export const STD_DEV_OPTIONS = [1, 1.5, 2, 2.5, 'custom'] as const
export type StdDevOption = (typeof STD_DEV_OPTIONS)[number]

export const IV_TERM_DEFAULT_EXPIRATIONS = 8
export const IV_TERM_MAX_EXPIRATIONS = 12

export function computeStrikesFromPreset(
  allStrikes: number[],
  spot: number | null,
  strikeCount: StrikeCountOption,
  stdDevValue: number,
): number[] {
  if (allStrikes.length === 0) return []
  const sorted = [...allStrikes].sort((a, b) => a - b)
  const effectiveSpot =
    spot != null && spot > 0 ? spot : sorted[Math.floor(sorted.length / 2)]
  const halfWidth = stdDevValue * 0.1 * effectiveSpot
  const inRange = sorted.filter(s => s >= effectiveSpot - halfWidth && s <= effectiveSpot + halfWidth)
  if (strikeCount === 'all') return inRange
  const n = Math.min(Number(strikeCount), inRange.length)
  const half = Math.floor(n / 2)
  const below = inRange.filter(s => s < effectiveSpot).sort((a, b) => (effectiveSpot - a) - (effectiveSpot - b)).slice(0, half)
  const above = inRange.filter(s => s > effectiveSpot).sort((a, b) => (a - effectiveSpot) - (b - effectiveSpot)).slice(0, n - half)
  const at = inRange.filter(s => s === effectiveSpot)
  return [...new Set([...below, ...at, ...above])].sort((a, b) => a - b)
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T & { cancel: () => void } {
  let tid: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: unknown[]) => {
    if (tid) clearTimeout(tid)
    tid = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => { if (tid) clearTimeout(tid) }
  return debounced as T & { cancel: () => void }
}

export function nyCalendarDateIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  const d = parts.find(p => p.type === 'day')?.value
  if (y && m && d) return `${y}-${m}-${d}`
  return new Date().toISOString().slice(0, 10)
}

export const CHAIN_COLUMN_LABEL: Record<string, string> = {
  day_open: 'Open',
  day_high: 'High',
  day_low: 'Low',
  day_close: 'Close',
  day_vol: 'Vol',
  iv: 'IV',
  delta: 'Delta',
  gamma: 'Gamma',
  theta: 'Theta',
  vega: 'Vega',
  oi: 'OI',
}

export const DEFAULT_CHAIN_COLUMN_VISIBILITY: Record<string, boolean> = {
  day_open: false,
  day_high: false,
  day_low: false,
  day_close: true,
  day_vol: false,
  iv: true,
  delta: true,
  gamma: false,
  theta: false,
  vega: false,
  oi: true,
}
