import { fmtUsd } from '@/lib/format'
import type { ByDayRangeData } from '@/types/trading'
import type { PerformanceTimeRange } from './performanceUtils'
import { getTimeRangeDates, listMonthKeysInRange } from './performanceUtils'

export type FiBarBucket = 'month' | 'quarter' | 'year'

export interface FiBar {
  key: string
  x: number
  y: number
  w: number
  h: number
  label: string
  /** Period stream total (month / quarter / year bucket). */
  monthlyNotional: number
  annualizedRatio: number
  valueLine: string
  valueX: number
  labelY: number
  showXLabel: boolean
  /** Hide on-chart value captions when bars are dense; hover title still has the value. */
  showValueCaption: boolean
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
  bucket: FiBarBucket
}

function fiBarUsdAbbrev(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

/** Align FI bar grain to Time Range so Year / 3Y are not 12–36 squeezed months. */
export function fiBarBucketForTimeRange(timeRange: PerformanceTimeRange): FiBarBucket {
  switch (timeRange) {
    case 'quarter':
    case 'halfyear':
      return 'month'
    case 'year':
      return 'quarter'
    case '3year':
      return 'year'
  }
}

export function monthKeyToFiBucketKey(monthKey: string, bucket: FiBarBucket): string {
  if (bucket === 'month') return monthKey
  if (bucket === 'year') return monthKey.slice(0, 4)
  const [y, m] = monthKey.split('-').map(Number)
  const q = Math.floor((m - 1) / 3) + 1
  return `${y}-Q${q}`
}

export function fiBucketLabel(bucketKey: string, bucket: FiBarBucket): string {
  if (bucket === 'month') {
    const [y, m] = bucketKey.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
  if (bucket === 'year') return bucketKey
  const [y, qPart] = bucketKey.split('-Q')
  return `Q${qPart} '${String(y).slice(2)}`
}

function daysInMonthKey(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
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

  const bucket = fiBarBucketForTimeRange(timeRange)

  const daily = byDayRangeData.stkBucketNotional.fixed_income
  const monthTotals = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  for (const [dateStr, raw] of Object.entries(daily)) {
    const mk = dateStr.slice(0, 7)
    if (!monthTotals.has(mk)) continue
    monthTotals.set(mk, (monthTotals.get(mk) ?? 0) + (Number(raw) || 0))
  }

  type Agg = { key: string; notional: number; days: number; order: number }
  const aggMap = new Map<string, Agg>()
  monthKeys.forEach((monthKey, idx) => {
    const bKey = monthKeyToFiBucketKey(monthKey, bucket)
    const prev = aggMap.get(bKey)
    const addN = monthTotals.get(monthKey) ?? 0
    const addD = daysInMonthKey(monthKey)
    if (!prev) {
      aggMap.set(bKey, { key: bKey, notional: addN, days: addD, order: idx })
    } else {
      prev.notional += addN
      prev.days += addD
    }
  })

  const rows = [...aggMap.values()]
    .sort((a, b) => a.order - b.order)
    .map((a) => {
      const periodRatio = hasFiPositionValueBase ? a.notional / fiPositionValueBase : 0
      const annualizedRatio =
        hasFiPositionValueBase && a.days > 0 ? periodRatio * (365 / a.days) : 0
      return {
        key: a.key,
        label: fiBucketLabel(a.key, bucket),
        monthlyNotional: a.notional,
        annualizedRatio,
        days: a.days,
      }
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
  const W = Math.max(176, Math.min(328, 56 + n * 48))
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
  const barW = Math.max(8, Math.min(36, slot * 0.55))
  const xLabelStep = Math.max(1, Math.ceil(n / 5))
  const showValueCaptions = n <= 6 && barW >= 14

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
      key: r.key,
      x, y: yRect, w: barW, h,
      label: r.label,
      monthlyNotional: r.monthlyNotional,
      annualizedRatio: r.annualizedRatio,
      valueLine,
      valueX: cx,
      labelY,
      showXLabel: i % xLabelStep === 0 || i === n - 1,
      showValueCaption: showValueCaptions,
      tone: v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero',
    }
  })

  const yTopLabel = fiAnnMode ? `${(100 * maxY).toFixed(2)}%` : fiBarUsdAbbrev(maxY)
  const yBotLabel = fiAnnMode ? `${(100 * minY).toFixed(2)}%` : fiBarUsdAbbrev(minY)

  return {
    W, H, plotX0, PR, PB, plotTop, plotBottom,
    bars, zeroY, yTopLabel, yBotLabel,
    chartW, chartH,
    useRatio, fiAnnMode, fiPositionValueBase,
    bucket,
  }
}
