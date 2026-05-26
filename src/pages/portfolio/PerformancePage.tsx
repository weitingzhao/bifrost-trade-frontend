import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { fetchPerformance } from '@/api/trading'
import { useOpportunities, useStrategyInstances } from '@/hooks/useStrategies'
import { usePerformanceBulk } from '@/hooks/usePerformanceBulk'
import {
  getTimeRangeDates,
  listMonthKeysInRange,
  type PerformanceTimeRange,
} from '@/utils/ledger/performanceUtils'
import { sumStkPositionMarketValueForBucket } from '@/utils/ledger/stkBuckets'
import { buildEquityGrowthChart, DEFAULT_LAYERS_VISIBLE, type GrowthLayer } from '@/utils/ledger/equityGrowthChart'
import { buildFiBarChart } from '@/utils/ledger/fiBarChart'
import { pnlColorClass } from '@/utils/dailyChange'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import type {
  PerformanceCalendarEntry,
  PerformanceDayPnLBulkResult,
  PerformanceResponse,
} from '@/types/trading'
import { EquityGrowthCard } from '@/components/performance/EquityGrowthCard'
import MonthlyPnLTable from '@/components/performance/MonthlyPnLTable'
import { CalendarDayDetail } from '@/components/performance/CalendarDayDetail'
import { CalendarSummaryPanel } from '@/components/performance/CalendarSummaryPanel'
import { buildPositionCategoryByAccountContract, serializePositionCategoryKey } from '@/utils/ledger/stkBuckets'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'

// ─── Formatting helpers ───

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function fmtMoneyFull(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtRawPct(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

function fmtPct2(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(2)}%`
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—'
  return String(v)
}

function fmtFactor(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toFixed(2)
}

// ─── Constants ───

const TIME_RANGE_OPTIONS: { id: PerformanceTimeRange; label: string }[] = [
  { id: 'quarter', label: 'Quarter' },
  { id: 'halfyear', label: 'Half Year' },
  { id: 'year', label: 'Year' },
  { id: '3year', label: '3 Years' },
]

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SEC_TYPE_LABELS: Record<string, string> = {
  OPT: 'Options',
  STK: 'Stocks',
  BOND: 'Fixed Income',
  CASH: 'Cash-like',
}

function secTypeLabel(t: string): string {
  return SEC_TYPE_LABELS[t] ?? t
}

// ─── Calendar helpers ───

type CalendarAssetTab = 'all' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'

const CALENDAR_ASSET_TABS: { id: CalendarAssetTab; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'options',      label: 'Options' },
  { id: 'stocks',       label: 'Stocks' },
  { id: 'fixed_income', label: 'Fixed Income' },
  { id: 'cash_like',    label: 'Cash-like' },
]

const SEC_TYPE_TAB: Record<string, Exclude<CalendarAssetTab, 'all'>> = {
  OPT: 'options', STK: 'stocks', BOND: 'fixed_income', CASH: 'cash_like',
}

interface DayData { realized: number; unrealized: number; tradeCount: number; notional: number }

interface CalendarWeek {
  days: (CalendarDayCell | null)[]
}

interface CalendarDayCell {
  date: string
  dayNum: number
  realized: number
  unrealized: number
  tradeCount: number
  notional: number
}

function buildDayMapFromBulk(
  calendarDayPnLByAsset: PerformanceDayPnLBulkResult['calendarDayPnLByAsset'],
  calendarStkNotionalByBucket: PerformanceDayPnLBulkResult['calendarStkNotionalByBucket'],
): Record<CalendarAssetTab, Map<string, DayData>> {
  const maps: Record<CalendarAssetTab, Map<string, DayData>> = {
    all: new Map(),
    options: new Map(),
    stocks: new Map(),
    fixed_income: new Map(),
    cash_like: new Map(),
  }

  const { options, stocks, fixed_income, cash_like } = calendarDayPnLByAsset
  const stkTabs = ['stocks', 'fixed_income', 'cash_like'] as const

  for (const tab of stkTabs) {
    const pnlRec = calendarDayPnLByAsset[tab]
    const notionalRec = calendarStkNotionalByBucket[tab]
    for (const [date, cell] of Object.entries(pnlRec)) {
      maps[tab].set(date, {
        realized: cell.realized,
        unrealized: cell.unrealized,
        tradeCount: 0,
        notional: notionalRec[date] ?? 0,
      })
    }
  }

  for (const [date, cell] of Object.entries(options)) {
    maps.options.set(date, {
      realized: cell.realized,
      unrealized: cell.unrealized,
      tradeCount: 0,
      notional: 0,
    })
  }

  const allDates = new Set([
    ...Object.keys(options),
    ...Object.keys(stocks),
    ...Object.keys(fixed_income),
    ...Object.keys(cash_like),
  ])
  for (const date of allDates) {
    const opt = options[date] ?? { realized: 0, unrealized: 0 }
    const stk = stocks[date] ?? { realized: 0, unrealized: 0 }
    const fi = fixed_income[date] ?? { realized: 0, unrealized: 0 }
    const cash = cash_like[date] ?? { realized: 0, unrealized: 0 }
    maps.all.set(date, {
      realized: opt.realized + stk.realized + fi.realized + cash.realized,
      unrealized: opt.unrealized,
      tradeCount: 0,
      notional: 0,
    })
  }

  return maps
}

function buildDayMapFromApi(perf: PerformanceResponse | undefined): Record<CalendarAssetTab, Map<string, DayData>> {
  const maps: Record<CalendarAssetTab, Map<string, DayData>> = {
    all: new Map(),
    options: new Map(),
    stocks: new Map(),
    fixed_income: new Map(),
    cash_like: new Map(),
  }
  for (const e of perf?.calendar ?? []) {
    if (e.period_label) {
      maps.all.set(e.period_label, {
        realized: e.net_pnl,
        unrealized: 0,
        tradeCount: e.trade_count,
        notional: 0,
      })
    }
  }
  for (const e of perf?.calendar_by_sec_type ?? []) {
    if (!e.period_label) continue
    const tab = SEC_TYPE_TAB[(e.sec_type ?? '').toUpperCase()]
    if (!tab) continue
    const prev = maps[tab].get(e.period_label) ?? { realized: 0, unrealized: 0, tradeCount: 0, notional: 0 }
    maps[tab].set(e.period_label, {
      realized: prev.realized + e.net_pnl,
      unrealized: 0,
      tradeCount: prev.tradeCount + e.trade_count,
      notional: 0,
    })
  }
  return maps
}

function buildCalendarGrid(
  yearMonth: string,
  dayMap: Map<string, DayData>,
): CalendarWeek[] {
  const [y, m] = yearMonth.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()

  // Monday=0 ... Sunday=6 (ISO weekday)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const weeks: CalendarWeek[] = []
  let currentWeek: (CalendarDayCell | null)[] = new Array(startDow).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`
    const data = dayMap.get(dateStr)
    currentWeek.push({
      date: dateStr,
      dayNum: d,
      realized: data?.realized ?? 0,
      unrealized: data?.unrealized ?? 0,
      tradeCount: data?.tradeCount ?? 0,
      notional: data?.notional ?? 0,
    })
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek })
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push({ days: currentWeek })
  }

  return weeks
}

// ─── Component ───

export default function PerformancePage() {
  const [timeRange, setTimeRange] = useState<PerformanceTimeRange>('quarter')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [calendarAssetTab, setCalendarAssetTab] = useState<CalendarAssetTab>('all')
  const [selectedOppId, setSelectedOppId] = useState<number | null>(null)
  const [selectedInstId, setSelectedInstId] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [growthUnit, setGrowthUnit] = useState<'pct' | 'usd'>('usd')
  const [growthLayersVisible, setGrowthLayersVisible] = useState(DEFAULT_LAYERS_VISIBLE)

  const handleLayerToggle = useCallback((layer: GrowthLayer) => {
    setGrowthLayersVisible((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }, [])

  // Compute time range
  const { sinceStr, untilStr } = useMemo(
    () => getTimeRangeDates(timeRange, calendarMonth),
    [timeRange, calendarMonth],
  )

  const sinceTs = useMemo(() => Math.floor(new Date(sinceStr).getTime() / 1000), [sinceStr])
  const untilTs = useMemo(
    () => Math.floor(new Date(untilStr + 'T23:59:59').getTime() / 1000),
    [untilStr],
  )

  // Data hooks
  const oppQuery = useOpportunities()
  const instQuery = useStrategyInstances(selectedOppId != null ? { opportunityId: selectedOppId } : undefined)

  const perfQuery = useQuery({
    queryKey: ['trading', 'performance', sinceTs, untilTs, selectedOppId, selectedInstId],
    queryFn: () =>
      fetchPerformance({
        since_ts: sinceTs,
        until_ts: untilTs,
        granularity: 'day',
        strategy_opportunity_id: selectedOppId ?? undefined,
        strategy_instance_id: selectedInstId ?? undefined,
        source_scope: 'performance_book',
      }),
  })

  const perf = perfQuery.data
  const summary = perf?.summary

  // Bulk PnL engine
  const bulkQuery = usePerformanceBulk({
    timeRange,
    calendarMonth,
    strategyOpportunityId: selectedOppId,
    strategyInstanceId: selectedInstId,
  })
  const bulk = bulkQuery.data

  // Monitor status for FI position market value
  const { data: monitorStatus } = useMonitorStatus()

  // STK bucket classification for day detail
  const positionCategoryKey = useMemo(
    () => serializePositionCategoryKey(monitorStatus),
    [monitorStatus],
  )
  const positionCategoryByAccountContract = useMemo(
    () => buildPositionCategoryByAccountContract(monitorStatus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positionCategoryKey],
  )

  // Growth chart data
  const equityGrowthChart = useMemo(() => {
    if (!bulk?.byDayRangeData) return null
    const capitalBase = perf?.transaction?.capital_base
      ?? perf?.transaction?.start_equity ?? null
    return buildEquityGrowthChart({
      byDayRangeData: bulk.byDayRangeData,
      capitalBase,
      growthUnit,
      layersVisible: growthLayersVisible,
    })
  }, [bulk, perf, growthUnit, growthLayersVisible])

  // FI bar chart data
  const fiBarData = useMemo(() => {
    if (!bulk?.byDayRangeData) return null
    const fiMv = sumStkPositionMarketValueForBucket(monitorStatus, 'fixed_income')
    return buildFiBarChart({
      byDayRangeData: bulk.byDayRangeData,
      fiPositionMarketValue: fiMv,
      timeRange,
      calendarMonth,
      growthUnit,
    })
  }, [bulk, monitorStatus, timeRange, calendarMonth, growthUnit])

  // Calendar data
  const monthKeys = useMemo(() => listMonthKeysInRange(sinceStr, untilStr), [sinceStr, untilStr])

  // Build per-asset-tab day maps — bulk engine preferred (R+U for options, R+N for STK)
  const dayMapByTab = useMemo(() => {
    if (bulk?.calendarDayPnLByAsset && bulk.calendarStkNotionalByBucket) {
      return buildDayMapFromBulk(bulk.calendarDayPnLByAsset, bulk.calendarStkNotionalByBucket)
    }
    return buildDayMapFromApi(perf)
  }, [bulk, perf])

  const activeDayMap = useMemo(
    () => dayMapByTab[calendarAssetTab],
    [dayMapByTab, calendarAssetTab],
  )

  const calendarGrid = useMemo(
    () => buildCalendarGrid(calendarMonth, activeDayMap),
    [calendarMonth, activeDayMap],
  )

  // Range totals strip — sum each asset tab across entire loaded range
  const rangeStats = useMemo(() => {
    const sum = (map: Map<string, DayData>) => {
      let realized = 0, unrealized = 0
      for (const d of map.values()) { realized += d.realized; unrealized += d.unrealized }
      return { realized, unrealized }
    }
    return {
      all:          sum(dayMapByTab.all),
      options:      sum(dayMapByTab.options),
      stocks:       sum(dayMapByTab.stocks),
      fixed_income: sum(dayMapByTab.fixed_income),
      cash_like:    sum(dayMapByTab.cash_like),
    }
  }, [dayMapByTab])

  const selectedDayCalendar = useMemo((): PerformanceCalendarEntry | undefined => {
    if (!selectedDay || !perf?.calendar) return undefined
    return perf.calendar.find((e) => e.period_label === selectedDay)
  }, [selectedDay, perf])

  // Sec type breakdown
  const secTypeBreakdown = useMemo(() => {
    const realizedArr = perf?.realized_by_sec_type ?? []
    const unrealizedArr = perf?.unrealized_by_sec_type ?? []
    const allKeys = new Set([
      ...realizedArr.map((r) => r.sec_type),
      ...unrealizedArr.map((u) => u.sec_type),
    ])
    return Array.from(allKeys).map((k) => {
      const r = realizedArr.find((x) => x.sec_type === k)
      const u = unrealizedArr.find((x) => x.sec_type === k)
      const realized = r?.net_pnl ?? 0
      const unrealized = u?.total_pnl ?? 0
      return { secType: k, realized, unrealized, total: realized + unrealized, tradeCount: r?.trade_count ?? 0 }
    })
  }, [perf?.realized_by_sec_type, perf?.unrealized_by_sec_type])

  // Month navigation
  const shiftMonth = useCallback(
    (delta: number) => {
      const [y, m] = calendarMonth.split('-').map(Number)
      const d = new Date(y, m - 1 + delta, 1)
      const ny = d.getFullYear()
      const nm = String(d.getMonth() + 1).padStart(2, '0')
      setCalendarMonth(`${ny}-${nm}`)
      setSelectedDay(null)
    },
    [calendarMonth],
  )

  const handleOppChange = useCallback((v: string) => {
    setSelectedOppId(v === 'all' ? null : Number(v))
    setSelectedInstId(null)
  }, [])

  const handleInstChange = useCallback((v: string) => {
    setSelectedInstId(v === 'all' ? null : Number(v))
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Flex Trades + journal-closed only
        </p>
      </div>

      {perfQuery.isError && (
        <QueryErrorAlert
          error={perfQuery.error}
          onRetry={() => void perfQuery.refetch()}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Time range pills */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeRange(opt.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  timeRange === opt.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Month navigator */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-[88px] text-center text-sm font-medium tabular-nums">
              {calendarMonth}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Strategy filter */}
          <Select value={selectedOppId != null ? String(selectedOppId) : 'all'} onValueChange={handleOppChange}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder="All strategies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All strategies</SelectItem>
              {(oppQuery.data?.items ?? []).map((o) => (
                <SelectItem key={o.strategy_opportunity_id} value={String(o.strategy_opportunity_id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Instance filter */}
          {selectedOppId != null && (
            <Select
              value={selectedInstId != null ? String(selectedInstId) : 'all'}
              onValueChange={handleInstChange}
            >
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="All instances" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All instances</SelectItem>
                {(instQuery.data?.items ?? []).map((i) => (
                  <SelectItem key={i.strategy_instance_id} value={String(i.strategy_instance_id)}>
                    {i.label ?? `#${i.strategy_instance_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Range label */}
        <p className="text-xs text-muted-foreground tabular-nums">
          Range: {sinceStr} ~ {untilStr}
        </p>
      </div>

      {/* Summary Cards */}
      {perfQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          <SummaryCard label="Total PnL" value={fmtMoney(summary?.net_pnl)} colorValue={summary?.net_pnl} />
          <SummaryCard label="Realized" value={fmtMoney(summary?.realized)} colorValue={summary?.realized} />
          <SummaryCard label="Unrealized" value={fmtMoney(summary?.total_unrealized_pnl)} colorValue={summary?.total_unrealized_pnl} />
          <SummaryCard
            label="Commission"
            value={fmtMoney(summary?.total_commission != null ? -Math.abs(summary.total_commission) : undefined)}
            colorValue={summary?.total_commission != null ? -Math.abs(summary.total_commission) : undefined}
          />
          <SummaryCard label="Trades" value={fmtNum(summary?.trade_count)} />
          <SummaryCard label="Win Rate" value={fmtRawPct(summary?.win_rate)} />
          <SummaryCard label="Profit Factor" value={fmtFactor(summary?.profit_factor)} />
          <SummaryCard
            label="Max Drawdown"
            value={fmtMoney(summary?.max_drawdown)}
            colorValue={summary?.max_drawdown != null ? -Math.abs(summary.max_drawdown) : undefined}
          />
          <SummaryCard label="Return%" value={fmtPct2(summary?.return_pct)} />
          <SummaryCard
            label="Avg W/L"
            value={
              summary?.avg_win != null || summary?.avg_loss != null
                ? `${fmtMoney(summary?.avg_win)} / ${fmtMoney(summary?.avg_loss)}`
                : '—'
            }
          />
        </div>
      )}

      {/* Sec Type Breakdown */}
      {secTypeBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Breakdown by Security Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {secTypeBreakdown.map((b) => (
                <div key={b.secType} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">{secTypeLabel(b.secType)}</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn('text-lg font-semibold tabular-nums', pnlColorClass(b.realized))}>
                      {fmtMoneyFull(b.realized)}
                    </span>
                    <span className="text-xs text-muted-foreground">realized</span>
                  </div>
                  {b.unrealized !== 0 && (
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className={cn('text-sm tabular-nums', pnlColorClass(b.unrealized))}>
                        {fmtMoneyFull(b.unrealized)}
                      </span>
                      <span className="text-xs text-muted-foreground">unrealized</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Equity Growth + FI Bar */}
      <EquityGrowthCard
        chartData={equityGrowthChart}
        fiBarData={fiBarData}
        growthUnit={growthUnit}
        onGrowthUnitChange={setGrowthUnit}
        layersVisible={growthLayersVisible}
        onLayerToggle={handleLayerToggle}
      />

      {/* Monthly PnL Summary Table */}
      <MonthlyPnLTable
        byDayRangeData={bulk?.byDayRangeData ?? null}
        isLoading={bulkQuery.isLoading}
      />

      {/* Calendar + horizontal Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
            {/* Calendar left — ~3/5 width on desktop */}
            <div className="min-w-0 flex-[3] rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1 flex-wrap">
                  {CALENDAR_ASSET_TABS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => { setCalendarAssetTab(id); setSelectedDay(null) }}
                      className={cn(
                        'px-2.5 py-0.5 text-xs rounded-full border transition-colors',
                        calendarAssetTab === id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {monthKeys.length > 1 && (
                  <div className="flex gap-1">
                    {monthKeys.map((mk) => (
                      <button
                        key={mk}
                        onClick={() => {
                          setCalendarMonth(mk)
                          setSelectedDay(null)
                        }}
                        className={cn(
                          'rounded px-2 py-0.5 text-xs transition-colors',
                          mk === calendarMonth
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {mk.slice(5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Range totals strip */}
              {perf && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums text-muted-foreground mb-3 pb-3 border-b border-border/50">
                  {(
                    [
                      { id: 'options',      label: 'Opt' },
                      { id: 'stocks',       label: 'Stk' },
                      { id: 'fixed_income', label: 'FI' },
                      { id: 'cash_like',    label: 'Cash' },
                    ] as const
                  ).map(({ id, label }) => {
                    const s = rangeStats[id]
                    if (s.realized === 0 && s.unrealized === 0) return null
                    return (
                      <span key={id} className="flex items-center gap-1">
                        <span className="text-muted-foreground/60">{label}</span>
                        <span className={cn(pnlColorClass(s.realized))}>{fmtMoney(s.realized)}</span>
                        {Math.abs(s.unrealized) >= 0.005 && (
                          <>
                            <span className="text-muted-foreground/40">/</span>
                            <span className="text-blue-400 dark:text-blue-300">{fmtMoney(s.unrealized)}</span>
                          </>
                        )}
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="mb-3 flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                <span className="text-sm font-semibold tabular-nums">{calendarMonth}</span>
                <Button variant="outline" size="sm" className="h-8" onClick={() => shiftMonth(1)} aria-label="Next month">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="mb-3 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                  R = Realized
                </span>
                {(calendarAssetTab === 'all' || calendarAssetTab === 'options') && (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
                    U = Unrealized
                  </span>
                )}
                {calendarAssetTab !== 'all' && calendarAssetTab !== 'options' && (
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-violet-600 dark:text-violet-400">
                    N = Notional
                  </span>
                )}
              </div>

              {(bulkQuery.isLoading || perfQuery.isLoading) ? (
                <Skeleton className="h-[280px] rounded-lg" />
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAY_LABELS.map((wd) => (
                      <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-1">
                        {wd}
                      </div>
                    ))}
                  </div>
                  {calendarGrid.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                      {week.days.map((cell, di) => {
                        if (!cell) {
                          return <div key={di} className="h-[5.25rem] rounded-md" />
                        }
                        const isStkTab = calendarAssetTab !== 'all' && calendarAssetTab !== 'options'
                        const showN = isStkTab && Math.abs(cell.notional) >= 0.005
                        const showU = !isStkTab && Math.abs(cell.unrealized) >= 0.005
                        const showR = Math.abs(cell.realized) >= 0.005 || showN
                        const hasData = showR || showU || showN
                        const isSelected = selectedDay === cell.date
                        const titleParts: string[] = []
                        if (isStkTab) {
                          titleParts.push(`Realized: ${fmtMoneyFull(cell.realized)}`)
                          titleParts.push(`Notional: ${fmtMoneyFull(cell.notional)}`)
                        } else {
                          titleParts.push(`Realized: ${fmtMoneyFull(cell.realized)}`)
                          titleParts.push(`Unrealized: ${fmtMoneyFull(cell.unrealized)}`)
                        }
                        return (
                          <button
                            key={di}
                            type="button"
                            title={titleParts.join('\n')}
                            onClick={() => setSelectedDay(isSelected ? null : cell.date)}
                            className={cn(
                              'relative h-[5.25rem] rounded-md border text-left p-1.5 transition-all',
                              isSelected
                                ? 'border-primary ring-1 ring-primary bg-primary/5'
                                : hasData
                                  ? 'border-border hover:border-foreground/30 bg-card'
                                  : 'border-transparent bg-muted/30',
                            )}
                          >
                            <span className="text-[11px] text-muted-foreground leading-none">
                              {cell.dayNum}
                            </span>
                            {hasData && (
                              <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                                {showR && (
                                  <span className={cn(
                                    'text-[10px] font-mono leading-tight block truncate',
                                    pnlColorClass(cell.realized),
                                  )}>
                                    R: {fmtMoney(cell.realized)}
                                  </span>
                                )}
                                {showU && (
                                  <span className="text-[10px] font-mono leading-tight block truncate text-blue-400 dark:text-blue-300">
                                    U: {fmtMoney(cell.unrealized)}
                                  </span>
                                )}
                                {showN && (
                                  <span
                                    className={cn(
                                      'text-[10px] font-mono leading-tight block truncate',
                                      calendarAssetTab === 'cash_like'
                                        ? 'text-violet-500 dark:text-violet-400'
                                        : cell.notional > 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : cell.notional < 0
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-muted-foreground',
                                    )}
                                  >
                                    N: {fmtMoney(cell.notional)}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary right — ~2/5 width on desktop, horizontal metric rows */}
            <div className="min-w-[280px] flex-[2]">
              <CalendarSummaryPanel
                summary={summary}
                perf={perf}
                bulk={bulk}
                calendarMonth={calendarMonth}
                calendarAssetTab={calendarAssetTab}
                isLoading={perfQuery.isLoading}
              />
            </div>
          </div>

          {selectedDay && selectedDayCalendar && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {selectedDay}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Net PnL</span>
                  <span className={cn('text-sm font-medium tabular-nums', pnlColorClass(selectedDayCalendar.net_pnl))}>
                    {fmtMoneyFull(selectedDayCalendar.net_pnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Gross PnL</span>
                  <span className={cn('text-sm tabular-nums', pnlColorClass(selectedDayCalendar.pnl))}>
                    {fmtMoneyFull(selectedDayCalendar.pnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Commission</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {fmtMoneyFull(-Math.abs(selectedDayCalendar.commission))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Trades</span>
                  <span className="text-sm tabular-nums">{selectedDayCalendar.trade_count}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Selected Day Detail — execution-level drill-down */}
      {selectedDay && bulk && (
        <CalendarDayDetail
          selectedDay={selectedDay}
          calendarAssetTab={calendarAssetTab}
          rawExecsWindow={bulk.rawExecsWindow}
          linkByOptionId={bulk.linkByOptionId}
          positionCategoryByAccountContract={positionCategoryByAccountContract}
          onClose={() => setSelectedDay(null)}
        />
      )}

    </div>
  )
}

// ─── Sub-components ───

function SummaryCard({
  label,
  value,
  colorValue,
}: {
  label: string
  value: string
  colorValue?: number | null
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
          {label}
        </p>
        <p
          className={cn(
            'text-lg font-semibold tabular-nums leading-tight truncate',
            colorValue != null ? pnlColorClass(colorValue) : '',
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

