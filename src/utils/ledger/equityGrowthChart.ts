import type { ByDayRangeData } from '@/types/trading'

export type GrowthLayer = 'options' | 'stocks' | 'fixed_income' | 'cash_like'

export interface GrowthLayerDef {
  key: GrowthLayer
  label: string
  color: string
  colorFill: string
}

export const GROWTH_LAYERS: GrowthLayerDef[] = [
  { key: 'options', label: 'Options', color: 'rgb(163,230,53)', colorFill: 'rgba(163,230,53,0.28)' },
  { key: 'stocks', label: 'Stocks', color: 'rgb(56,189,248)', colorFill: 'rgba(56,189,248,0.22)' },
  { key: 'fixed_income', label: 'Fix-In', color: 'rgb(251,191,36)', colorFill: 'rgba(251,191,36,0.18)' },
  { key: 'cash_like', label: 'Cash-like', color: 'rgb(167,139,250)', colorFill: 'rgba(167,139,250,0.18)' },
]

export const DEFAULT_LAYERS_VISIBLE: Record<GrowthLayer, boolean> = {
  options: true,
  stocks: false,
  fixed_income: true,
  cash_like: false,
}

export interface GrowthPoint {
  dateStr: string
  dateLabel: string
  options: number
  stocks: number
  fixed_income: number
  cash_like: number
  total: number
  totalVisible: number
  totalRaw: number
  totalRawVisible: number
  optionsUnrealMonthStart: number
  optionsUnrealMonthDelta: number
  optionsUnrealMonthAnchored: number
}

export interface LayerArea {
  key: GrowthLayer
  label: string
  color: string
  colorFill: string
  area: string
  path: string
}

export interface MonthBand {
  x1: number
  x2: number
  alt: boolean
}

export interface GridLine {
  y: number
  label: string
}

export interface XTick {
  x: number
  label: string
}

export interface HitPoint {
  cx: number
  cyTotal: number
  cyOptUnreal: number
}

export interface EquityGrowthChartData {
  W: number; H: number
  PL: number; PR: number; PT: number; PB: number
  chartW: number; chartH: number
  totalPath: string
  layerAreas: LayerArea[]
  gridLines: GridLine[]
  xTicks: XTick[]
  zeroY: number | null
  first: GrowthPoint
  last: GrowthPoint
  hasCapitalBase: boolean
  isPct: boolean
  points: GrowthPoint[]
  monthBands: MonthBand[]
  optionsUnrealPath: string
  growthChartHit: HitPoint[]
}

function fmtUsdCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

export function buildEquityGrowthChart(params: {
  byDayRangeData: ByDayRangeData
  capitalBase: number | null
  growthUnit: 'pct' | 'usd'
  layersVisible: Record<GrowthLayer, boolean>
}): EquityGrowthChartData | null {
  const { byDayRangeData, capitalBase: rawCb, growthUnit, layersVisible: vis } = params

  const capitalBase = Number(rawCb)
  const hasCapitalBase = Number.isFinite(capitalBase) && capitalBase > 0
  const isPct = growthUnit === 'pct' && hasCapitalBase

  const { opt, stocks: stocksMap, fixed_income: fiMap, cash_like: cashMap, stkBucketNotional } = byDayRangeData
  const fiNotionalMap = stkBucketNotional.fixed_income

  const allDates = [...new Set([
    ...Object.keys(opt), ...Object.keys(stocksMap),
    ...Object.keys(fiMap), ...Object.keys(fiNotionalMap), ...Object.keys(cashMap),
  ])].sort()

  if (allDates.length === 0) return null

  const conv = (v: number) => (isPct ? (100 * v) / capitalBase : v)

  let cumOpt = 0, cumStk = 0, cumFi = 0, cumCash = 0
  let currentOptUMonth = ''
  let optUMonthStartRealizedRaw = 0
  let optUMonthDeltaRaw = 0

  const points: GrowthPoint[] = allDates.map((dateStr) => {
    cumOpt += opt[dateStr]?.realized ?? 0
    cumStk += stocksMap[dateStr]?.realized ?? 0
    cumFi += fiNotionalMap[dateStr] ?? 0
    cumCash += cashMap[dateStr]?.realized ?? 0

    const mk = dateStr.slice(0, 7)
    const uNowRaw = opt[dateStr]?.unrealized ?? 0
    if (mk !== currentOptUMonth) {
      currentOptUMonth = mk
      optUMonthStartRealizedRaw = cumOpt
      optUMonthDeltaRaw = 0
    } else {
      optUMonthDeltaRaw += uNowRaw
    }
    const optUnrealMonthAnchored = optUMonthStartRealizedRaw + optUMonthDeltaRaw

    const totalRaw = cumOpt + cumStk + cumFi + cumCash
    const totalRawVisible =
      (vis.options ? cumOpt : 0) +
      (vis.stocks ? cumStk : 0) +
      (vis.fixed_income ? cumFi : 0) +
      (vis.cash_like ? cumCash : 0)

    const [yy, mm, dd] = dateStr.split('-').map(Number)
    const dateLabel = new Date(yy, mm - 1, dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    return {
      dateStr,
      dateLabel,
      options: conv(cumOpt),
      stocks: conv(cumStk),
      fixed_income: conv(cumFi),
      cash_like: conv(cumCash),
      total: conv(totalRaw),
      totalVisible: conv(totalRawVisible),
      totalRaw,
      totalRawVisible,
      optionsUnrealMonthStart: conv(optUMonthStartRealizedRaw),
      optionsUnrealMonthDelta: conv(optUMonthDeltaRaw),
      optionsUnrealMonthAnchored: conv(optUnrealMonthAnchored),
    }
  })

  const W = 720, H = 220, PL = 6, PR = 6, PT = 14, PB = 28
  const chartW = W - PL - PR, chartH = H - PT - PB

  const valsForScale: number[] = []
  for (const p of points) {
    if (vis.options) {
      valsForScale.push(p.options)
      valsForScale.push(p.optionsUnrealMonthAnchored)
    }
    if (vis.stocks) valsForScale.push(p.stocks)
    if (vis.fixed_income) valsForScale.push(p.fixed_income)
    if (vis.cash_like) valsForScale.push(p.cash_like)
    valsForScale.push(p.totalVisible)
  }

  let minY = Math.min(0, ...valsForScale)
  let maxY = Math.max(0, ...valsForScale)
  if (Math.abs(maxY - minY) < 1e-9) { maxY += 1; minY -= 1 }
  const yPad = (maxY - minY) * 0.1
  minY -= yPad; maxY += yPad

  const xScale = (i: number) => PL + (i / Math.max(1, points.length - 1)) * chartW
  const yScale = (v: number) => PT + chartH - ((v - minY) / (maxY - minY)) * chartH

  const makePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ')

  const makeArea = (vals: number[]) => {
    const top = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ')
    const base = `L${xScale(vals.length - 1).toFixed(1)},${yScale(0).toFixed(1)} L${xScale(0).toFixed(1)},${yScale(0).toFixed(1)} Z`
    return `${top} ${base}`
  }

  const totalPath = makePath(points.map((p) => p.totalVisible))
  const layerAreas: LayerArea[] = GROWTH_LAYERS.map((l) => ({
    ...l,
    area: makeArea(points.map((p) => p[l.key])),
    path: makePath(points.map((p) => p[l.key])),
  }))
  const optionsUnrealPath = vis.options ? makePath(points.map((p) => p.optionsUnrealMonthAnchored)) : ''

  const gridCount = 5
  const gridLines: GridLine[] = Array.from({ length: gridCount }, (_, i) => {
    const v = minY + ((maxY - minY) * (i + 1)) / (gridCount + 1)
    return { y: yScale(v), label: isPct ? `${v.toFixed(1)}%` : fmtUsdCompact(v) }
  })

  const xTickCount = Math.min(points.length, 8)
  const xTickStep = Math.max(1, Math.floor(points.length / xTickCount))
  const xTicks: XTick[] = points
    .filter((_, i) => i % xTickStep === 0 || i === points.length - 1)
    .map((p) => ({ x: xScale(points.indexOf(p)), label: p.dateLabel }))

  const zeroY = minY <= 0 && maxY >= 0 ? yScale(0) : null
  const last = points[points.length - 1]!
  const first = points[0]!

  const nPts = points.length
  const monthBands: MonthBand[] = []
  if (nPts > 0) {
    let seg0 = 0
    let altBand = false
    const pushSeg = (i0: number, i1: number) => {
      const x1 = i0 === 0 ? PL : (xScale(i0 - 1) + xScale(i0)) / 2
      const x2 = i1 === nPts - 1 ? W - PR : (xScale(i1) + xScale(i1 + 1)) / 2
      if (x2 > x1 + 0.25) monthBands.push({ x1, x2, alt: altBand })
      altBand = !altBand
    }
    for (let i = 1; i < nPts; i++) {
      if (points[i]!.dateStr.slice(0, 7) !== points[seg0]!.dateStr.slice(0, 7)) {
        pushSeg(seg0, i - 1)
        seg0 = i
      }
    }
    pushSeg(seg0, nPts - 1)
  }

  const growthChartHit: HitPoint[] = points.map((p, i) => ({
    cx: xScale(i),
    cyTotal: yScale(p.totalVisible),
    cyOptUnreal: yScale(p.optionsUnrealMonthAnchored),
  }))

  return {
    W, H, PL, PR, PT, PB, chartW, chartH,
    totalPath, layerAreas, gridLines, xTicks, zeroY,
    first, last, hasCapitalBase, isPct, points,
    monthBands,
    optionsUnrealPath,
    growthChartHit,
  }
}
