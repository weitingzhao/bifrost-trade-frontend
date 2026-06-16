import type { SymbolOptionPcrTrendPoint } from '@/types/research'

/** API always fetches max history; chart/table window is user-selectable. */
export const PCR_FETCH_DAYS = 365
export const PCR_DEFAULT_WINDOW_DAYS = 90
export const PCR_WINDOW_OPTIONS = [
  { label: '90D', days: 90 },
  { label: '180D', days: 180 },
  { label: '365D', days: 365 },
] as const

export type PcrWindowDays = (typeof PCR_WINDOW_OPTIONS)[number]['days']

export const PCR_COLORS = {
  oiLine: 'var(--color-chart-oi-call)',
  volLine: 'var(--color-chart-cash)',
  putOi: 'var(--color-chart-oi-put)',
  callOi: 'var(--color-chart-oi-call)',
} as const

/** Wide viewBox + preserveAspectRatio="none" on SVG → plot fills sidebar width. */
export const PCR_CHART_LAYOUT = {
  ratio: { h: 140, vw: 960, pl: 44, pr: 14, pt: 8, pb: 28 },
  oi: { h: 128, vw: 960, pl: 48, pr: 10, pt: 8, pb: 28 },
} as const

const DAY_MS = 86_400_000

function tickCountForWindow(windowDays: number): number {
  if (windowDays <= 90) return 5
  if (windowDays <= 180) return 6
  return 7
}

export function fmtChartTickDate(ms: number): string {
  const d = new Date(ms)
  const yy = String(d.getUTCFullYear()).slice(-2)
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export type PcrChartScale = {
  startMs: number
  endMs: number
  spanMs: number
  ticks: { ms: number; label: string }[]
}

export function parseTradeDayMs(iso: string): number | null {
  const s = (iso || '').slice(0, 10)
  if (s.length < 10) return null
  const [y, m, d] = s.split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  return Date.UTC(y, m - 1, d)
}

export function buildPcrChartScale(
  points: SymbolOptionPcrTrendPoint[],
  windowDays: number,
  asOfDate?: string | null,
): PcrChartScale {
  const lb = Math.max(30, Math.min(PCR_FETCH_DAYS, windowDays))
  let endMs = parseTradeDayMs(asOfDate ?? '')
  if (endMs == null && points.length > 0) {
    for (let i = points.length - 1; i >= 0; i -= 1) {
      endMs = parseTradeDayMs(points[i].trade_date)
      if (endMs != null) break
    }
  }
  if (endMs == null) {
    const t = new Date()
    endMs = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())
  }
  const startMs = endMs - lb * DAY_MS
  const spanMs = Math.max(DAY_MS, endMs - startMs)
  const want = tickCountForWindow(lb)
  const ticks: { ms: number; label: string }[] = []
  for (let i = 0; i < want; i += 1) {
    const ms = startMs + (spanMs * i) / Math.max(1, want - 1)
    ticks.push({ ms, label: fmtChartTickDate(ms) })
  }
  return { startMs, endMs, spanMs, ticks }
}

/** Same date window as charts — used for Show Data table rows. */
export function filterTrendInWindow(
  points: SymbolOptionPcrTrendPoint[],
  windowDays: number,
  asOfDate?: string | null,
): SymbolOptionPcrTrendPoint[] {
  if (points.length === 0) return []
  const scale = buildPcrChartScale(points, windowDays, asOfDate)
  return points.filter((p) => {
    const ms = parseTradeDayMs(p.trade_date)
    return ms != null && ms >= scale.startMs && ms <= scale.endMs
  })
}

export function xFromTradeDate(ms: number, scale: PcrChartScale, pl: number, cw: number): number {
  const t = Math.max(0, Math.min(1, (ms - scale.startMs) / scale.spanMs))
  return pl + t * cw
}

export function niceOiAxisMax(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 10_000_000
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  if (n <= 2) return 2 * mag
  if (n <= 5) return 5 * mag
  return 10 * mag
}

export function fmtOiAxis(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0.0'
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toFixed(1)
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 1 : 2)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`
  return n.toLocaleString()
}

export function fmtPcRatio(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(2)
}

export function fmtChainNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

export function ratioToneClass(v: number | null | undefined, high: string, low: string): string {
  if (v == null || !Number.isFinite(v)) return ''
  return v >= 1 ? high : low
}
