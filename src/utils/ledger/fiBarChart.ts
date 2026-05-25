import type { ByDayRangeData } from '@/types/trading'
import type { PerformanceTimeRange } from './performanceUtils'
import { getTimeRangeDates, listMonthKeysInRange } from './performanceUtils'

export interface FiBar {
  key: string
  x: number
  y: number
  w: number
  h: number
  label: string
  monthlyNotional: number
  annualizedRatio: number
  valueLine: string
  valueX: number
  labelY: number
  showXLabel: boolean
  tone: 'pos' | 'neg' | 'zero'
}

export interface FiBarChartData {
  W: number
  H: number
  plotX0: number
  PR: number
  PB: number
  plotTop: number
  plotBottom: number
  bars: FiBar[]
  zeroY: number
  yTopLabel: string
  yBotLabel: string
  chartW: number
  chartH: number
  useRatio: boolean
  fiAnnMode: boolean
  fiPositionValueBase: number
}

function fmtUsdCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function fmtUsd(v: number): string {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function buildFiBarChart(params: {
  byDayRangeData: ByDayRangeData
  fiPositionMarketValue: number | null
  timeRange: PerformanceTimeRange
  calendarMonth: string
  growthUnit: 'pct' | 'usd'
}): FiBarChartData | null {
  const { byDayRangeData, fiPositionMarketValue, timeRange, calendarMonth, growthUnit } = params

  const fiPositionValueBase = Number(fiPositionMarketValue)
  const hasFiPositionValueBase = Number.isFinite(fiPositionValueBase) && fiPositionValueBase > 0

  const { sinceStr, untilStr } = getTimeRangeDates(timeRange, calendarMonth)
  const monthKeys = listMonthKeysInRange(sinceStr, untilStr)
  if (monthKeys.length === 0) return null

  const daily = byDayRangeData.stkBucketNotional.fixed_income
  const totals = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  for (const [dateStr, raw] of Object.entries(daily)) {
    const mk = dateStr.slice(0, 7)
    if (!totals.has(mk)) continue
    totals.set(mk, (totals.get(mk) ?? 0) + (Number(raw) || 0))
  }

  const rows = monthKeys.map((monthKey) => {
    const [y, m] = monthKey.split('-').map(Number)
    const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const monthlyNotional = totals.get(monthKey) ?? 0
    const daysInMonth = new Date(y, m, 0).getDate()
    const monthlyRatio = hasFiPositionValueBase ? monthlyNotional / fiPositionValueBase : 0
    const annualizedRatio = hasFiPositionValueBase && daysInMonth > 0
      ? monthlyRatio * (365 / daysInMonth) : 0
    return { monthKey, label, monthlyNotional, annualizedRatio, daysInMonth }
  })

  const useRatio = hasFiPositionValueBase
  const fiAnnMode = useRatio && growthUnit === 'pct'

  const vals = fiAnnMode
    ? rows.map((r) => r.annualizedRatio)
    : rows.map((r) => r.monthlyNotional)

  let minY = Math.min(0, ...vals)
  let maxY = Math.max(0, ...vals)
  if (Math.abs(maxY - minY) < 1e-9) { maxY = 1; minY = -1 }
  const pad = (maxY - minY) * 0.08
  minY -= pad; maxY += pad

  const n = rows.length
  const W = Math.max(176, Math.min(328, 40 + n * 12))
  const H = 186
  const axisGutter = 32
  const plotX0 = axisGutter + 2
  const PR = 6
  const PB = 26
  const plotTop = 6
  const plotBottom = H - PB
  const chartW = W - plotX0 - PR
  const chartH = plotBottom - plotTop

  const yScale = (v: number) => plotBottom - ((v - minY) / (maxY - minY)) * chartH
  const zeroY = yScale(0)
  const slot = chartW / Math.max(1, n)
  const barW = Math.max(2, Math.min(20, slot * 0.58))
  const xLabelStep = Math.max(1, Math.ceil(n / 5))

  const bars: FiBar[] = rows.map((r, i) => {
    const v = fiAnnMode ? r.annualizedRatio : r.monthlyNotional
    const cx = plotX0 + (i + 0.5) * slot
    const x = cx - barW / 2
    const t = yScale(Math.max(0, v))
    const b = yScale(Math.min(0, v))
    const h = Math.max(v === 0 ? 0 : 1, Math.abs(b - t))
    const yRect = Math.min(t, b)

    const valueLine = fiAnnMode
      ? `${(100 * r.annualizedRatio).toFixed(2)}%`
      : fmtUsd(r.monthlyNotional)

    let labelY: number
    if (v === 0) labelY = Math.max(plotTop + 4, zeroY - 6)
    else if (v > 0) labelY = Math.max(plotTop + 4, yRect - 5)
    else labelY = Math.min(plotBottom - 10, yRect + h + 6)

    return {
      key: r.monthKey,
      x, y: yRect, w: barW, h,
      label: r.label,
      monthlyNotional: r.monthlyNotional,
      annualizedRatio: r.annualizedRatio,
      valueLine,
      valueX: cx,
      labelY,
      showXLabel: i % xLabelStep === 0 || i === n - 1,
      tone: v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero',
    }
  })

  const yTopLabel = fiAnnMode ? `${(100 * maxY).toFixed(2)}%` : fmtUsdCompact(maxY)
  const yBotLabel = fiAnnMode ? `${(100 * minY).toFixed(2)}%` : fmtUsdCompact(minY)

  return {
    W, H, plotX0, PR, PB, plotTop, plotBottom,
    bars, zeroY, yTopLabel, yBotLabel,
    chartW, chartH,
    useRatio, fiAnnMode, fiPositionValueBase,
  }
}
