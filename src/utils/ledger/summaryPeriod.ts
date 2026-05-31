export type LedgerSummaryPeriod = 'month' | 'quarter' | 'half_year' | 'year'

export const LEDGER_SUMMARY_PERIOD_TABS: { id: LedgerSummaryPeriod; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'half_year', label: 'Half-year' },
  { id: 'year', label: 'Year' },
]

export type LedgerSincePreset = 'month' | 'quarter' | 'half_year' | 'year' | 'ytd' | 'all'

export const LEDGER_SINCE_PRESET_TABS: { id: LedgerSincePreset; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'month', label: '1 month' },
  { id: 'quarter', label: '1 quarter' },
  { id: 'half_year', label: 'Half-year' },
  { id: 'year', label: '1 year' },
  { id: 'ytd', label: 'YTD' },
]

const MONTH_RE = /^(\d{4})-(\d{2})$/

export function monthKeyToPeriodKey(monthKey: string, period: LedgerSummaryPeriod): string {
  const m = MONTH_RE.exec(monthKey)
  if (!m) return monthKey
  const y = Number(m[1])
  const month = Number(m[2]) - 1
  if (!Number.isFinite(y) || month < 0 || month > 11) return monthKey
  if (period === 'month') return monthKey
  if (period === 'year') return String(y)
  if (period === 'quarter') return `${y}-Q${Math.floor(month / 3) + 1}`
  return `${y}-H${month < 6 ? 1 : 2}`
}

function parsePeriodSortKey(k: string, period: LedgerSummaryPeriod): number[] {
  if (period === 'year') {
    const n = Number(k)
    return Number.isFinite(n) ? [n, 0] : [0, 0]
  }
  if (period === 'month') {
    const m = MONTH_RE.exec(k)
    if (m) return [Number(m[1]), Number(m[2])]
    return [0, 0]
  }
  const q = /^(\d{4})-Q([1-4])$/.exec(k)
  if (q) return [Number(q[1]), Number(q[2])]
  const h = /^(\d{4})-H([12])$/.exec(k)
  if (h) return [Number(h[1]), Number(h[2])]
  return [0, 0]
}

export function comparePeriodKeysDesc(
  a: string,
  b: string,
  period: LedgerSummaryPeriod,
): number {
  const ta = parsePeriodSortKey(a, period)
  const tb = parsePeriodSortKey(b, period)
  for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
    const va = ta[i] ?? 0
    const vb = tb[i] ?? 0
    if (vb !== va) return vb - va
  }
  return 0
}

export function formatPeriodLabel(key: string, period: LedgerSummaryPeriod): string {
  if (period === 'year') {
    const n = Number(key)
    return Number.isFinite(n) ? String(n) : key
  }
  if (period === 'month') return key
  const q = /^(\d{4})-Q([1-4])$/.exec(key)
  if (q) return `${q[1]} Q${q[2]}`
  const h = /^(\d{4})-H([12])$/.exec(key)
  if (h) return `${h[1]} H${h[2]}`
  return key
}

interface OptionPeriodEntry { count: number; realizedPnl: number }
interface StockPeriodEntry { count: number; notional: number; realizedPnl: number }

export function rollupOptionsFromMonthly(
  monthly: [string, OptionPeriodEntry][],
  period: LedgerSummaryPeriod,
): [string, OptionPeriodEntry][] {
  const map = new Map<string, OptionPeriodEntry>()
  for (const [mk, v] of monthly) {
    const pk = monthKeyToPeriodKey(mk, period)
    const prev = map.get(pk) ?? { count: 0, realizedPnl: 0 }
    prev.count += v.count
    prev.realizedPnl += v.realizedPnl
    map.set(pk, prev)
  }
  const keys = Array.from(map.keys())
  keys.sort((a, b) => comparePeriodKeysDesc(a, b, period))
  return keys.map(k => [k, map.get(k)!])
}

export function rollupStocksFromMonthly(
  monthly: [string, StockPeriodEntry][],
  period: LedgerSummaryPeriod,
): [string, StockPeriodEntry][] {
  const map = new Map<string, StockPeriodEntry>()
  for (const [mk, v] of monthly) {
    const pk = monthKeyToPeriodKey(mk, period)
    const prev = map.get(pk) ?? { count: 0, notional: 0, realizedPnl: 0 }
    prev.count += v.count
    prev.notional += v.notional
    prev.realizedPnl += v.realizedPnl
    map.set(pk, prev)
  }
  const keys = Array.from(map.keys())
  keys.sort((a, b) => comparePeriodKeysDesc(a, b, period))
  return keys.map(k => [k, map.get(k)!])
}

function localYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Legacy: preset `null` / UI "All" disables trade-date filtering entirely (not a 2000-01-01 floor). */
export function shouldApplySinceTradeFilter(
  sincePreset: LedgerSincePreset,
  expiryFilterYear: string,
): boolean {
  if (expiryFilterYear.trim()) return false
  return sincePreset !== 'all'
}

export function getSinceTradeDateRange(
  preset: LedgerSincePreset,
  ref: Date = new Date(),
): { start: string; end: string } {
  const end = localYmd(ref)

  if (preset === 'all') return { start: '2000-01-01', end }

  if (preset === 'ytd') {
    return { start: `${ref.getFullYear()}-01-01`, end }
  }

  const monthsBack: Record<string, number> = {
    month: 1,
    quarter: 3,
    half_year: 6,
    year: 12,
  }
  const back = monthsBack[preset] ?? 1
  const startDate = new Date(ref)
  startDate.setMonth(startDate.getMonth() - back)
  return { start: localYmd(startDate), end }
}

export function ledgerExecutionDateKey(
  tradeDate: string | null | undefined,
  timeSec: number | null | undefined,
): string | null {
  if (tradeDate) {
    const d = tradeDate.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  }
  if (timeSec != null && timeSec > 0) {
    return localYmd(new Date(timeSec * 1000))
  }
  return null
}

export function executionMatchesLedgerTradePeriod(
  tradeDate: string | null | undefined,
  timeSec: number | null | undefined,
  range: { start: string; end: string },
): boolean {
  const d = ledgerExecutionDateKey(tradeDate, timeSec)
  if (!d) return false
  return d >= range.start && d <= range.end
}

export function executionMatchesExpiryYearMonth(
  expiry: string | undefined,
  year: string,
  month: string,
): boolean {
  const y = year.trim()
  if (!y) return true
  const ex = (expiry ?? '').replace(/-/g, '')
  const ys = y.slice(0, 4)
  if (!month.trim()) return ex.length >= 4 && ex.slice(0, 4) === ys
  const mm = month.trim().padStart(2, '0').slice(0, 2)
  return ex.length >= 6 && ex.slice(0, 6) === `${ys}${mm}`
}
