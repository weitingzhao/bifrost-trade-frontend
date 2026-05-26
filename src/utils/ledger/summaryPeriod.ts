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
  { id: 'month', label: '1 Month' },
  { id: 'quarter', label: '1 Quarter' },
  { id: 'half_year', label: 'Half-year' },
  { id: 'year', label: '1 Year' },
  { id: 'ytd', label: 'YTD' },
]

const MONTH_RE = /^(\d{4})-(\d{2})$/

export function monthKeyToPeriodKey(monthKey: string, period: LedgerSummaryPeriod): string {
  const m = MONTH_RE.exec(monthKey)
  if (!m) return monthKey
  const year = m[1]
  const month = parseInt(m[2], 10) - 1

  switch (period) {
    case 'month':
      return monthKey
    case 'year':
      return year
    case 'quarter':
      return `${year}-Q${Math.floor(month / 3) + 1}`
    case 'half_year':
      return month < 6 ? `${year}-H1` : `${year}-H2`
  }
}

function parsePeriodKey(key: string): [number, number] {
  if (/^\d{4}$/.test(key)) return [parseInt(key, 10), 0]
  const mm = MONTH_RE.exec(key)
  if (mm) return [parseInt(mm[1], 10), parseInt(mm[2], 10)]
  const qm = /^(\d{4})-Q(\d)$/.exec(key)
  if (qm) return [parseInt(qm[1], 10), parseInt(qm[2], 10)]
  const hm = /^(\d{4})-H(\d)$/.exec(key)
  if (hm) return [parseInt(hm[1], 10), parseInt(hm[2], 10)]
  return [0, 0]
}

export function comparePeriodKeysDesc(a: string, b: string): number {
  const [ay, as] = parsePeriodKey(a)
  const [by, bs] = parsePeriodKey(b)
  if (by !== ay) return by - ay
  return bs - as
}

export function formatPeriodLabel(key: string, period: LedgerSummaryPeriod): string {
  if (period === 'year') return key
  if (period === 'month') return key
  const qm = /^(\d{4})-Q(\d)$/.exec(key)
  if (qm) return `${qm[1]} Q${qm[2]}`
  const hm = /^(\d{4})-H(\d)$/.exec(key)
  if (hm) return `${hm[1]} H${hm[2]}`
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
  return Array.from(map.entries()).sort(([a], [b]) => comparePeriodKeysDesc(a, b))
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
  return Array.from(map.entries()).sort(([a], [b]) => comparePeriodKeysDesc(a, b))
}

function localYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
