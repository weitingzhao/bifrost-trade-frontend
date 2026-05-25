import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { fetchPerformance } from '@/api/trading'
import { useOpportunities, useStrategyInstances } from '@/hooks/useStrategies'
import {
  getTimeRangeDates,
  listMonthKeysInRange,
  type PerformanceTimeRange,
} from '@/utils/ledger/performanceUtils'
import { pnlColorClass } from '@/utils/dailyChange'
import type {
  PerformanceCalendarEntry,
  PerformanceCalendarBySecType,
} from '@/types/trading'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react'

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

interface DayData { realized: number; unrealized: number; tradeCount: number }

interface CalendarWeek {
  days: (CalendarDayCell | null)[]
}

interface CalendarDayCell {
  date: string
  dayNum: number
  realized: number
  unrealized: number
  tradeCount: number
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
  const instQuery = useStrategyInstances(selectedOppId ?? undefined)

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

  // Calendar data
  const monthKeys = useMemo(() => listMonthKeysInRange(sinceStr, untilStr), [sinceStr, untilStr])

  // Build per-asset-tab day maps from API data
  const dayMapByTab = useMemo(() => {
    const maps: Record<CalendarAssetTab, Map<string, DayData>> = {
      all: new Map(), options: new Map(), stocks: new Map(),
      fixed_income: new Map(), cash_like: new Map(),
    }
    for (const e of perf?.calendar ?? []) {
      if (e.period_label) maps.all.set(e.period_label, { realized: e.net_pnl, unrealized: 0, tradeCount: e.trade_count })
    }
    for (const e of perf?.calendar_by_sec_type ?? []) {
      if (!e.period_label) continue
      const tab = SEC_TYPE_TAB[(e.sec_type ?? '').toUpperCase()]
      if (!tab) continue
      const prev = maps[tab].get(e.period_label) ?? { realized: 0, unrealized: 0, tradeCount: 0 }
      maps[tab].set(e.period_label, {
        realized: prev.realized + e.net_pnl,
        unrealized: 0,
        tradeCount: prev.tradeCount + e.trade_count,
      })
    }
    return maps
  }, [perf?.calendar, perf?.calendar_by_sec_type])

  const activeDayMap = useMemo(
    () => dayMapByTab[calendarAssetTab],
    [dayMapByTab, calendarAssetTab],
  )

  const calendarGrid = useMemo(
    () => buildCalendarGrid(calendarMonth, activeDayMap),
    [calendarMonth, activeDayMap],
  )

  // Month stats for sidebar — driven by active tab's day map
  const monthStats = useMemo(() => {
    let totalDays = 0, winDays = 0, lossDays = 0, monthPnl = 0
    for (const [date, data] of activeDayMap) {
      if (!date.startsWith(calendarMonth)) continue
      const net = data.realized + data.unrealized
      if (data.tradeCount > 0) {
        totalDays++
        if (net > 0) winDays++
        else if (net < 0) lossDays++
      }
      monthPnl += net
    }
    return { totalDays, winDays, lossDays, monthPnl }
  }, [activeDayMap, calendarMonth])

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

  // Selected day detail
  const selectedDayData = useMemo((): PerformanceCalendarBySecType[] => {
    if (!selectedDay || !perf?.calendar_by_sec_type) return []
    return perf.calendar_by_sec_type.filter((e) => e.period_label === selectedDay)
  }, [selectedDay, perf?.calendar_by_sec_type])

  const selectedDayCalendar = useMemo((): PerformanceCalendarEntry | undefined => {
    if (!selectedDay || !perf?.calendar) return undefined
    return perf.calendar.find((e) => e.period_label === selectedDay)
  }, [selectedDay, perf?.calendar])

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

  // Cumulative curve
  const curveData = perf?.cumulative_curve

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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-[88px] text-center text-sm font-medium tabular-nums">
              {calendarMonth}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftMonth(1)}>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
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

      {/* Calendar + Sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Calendar Grid */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                {calendarMonth} Calendar
              </CardTitle>
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
          </CardHeader>
          <CardContent>
            {/* Asset tab switcher */}
            <div className="flex gap-1 mb-3 flex-wrap">
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

            {perfQuery.isLoading ? (
              <Skeleton className="h-[240px] rounded-lg" />
            ) : (
              <div className="overflow-x-auto">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAY_LABELS.map((wd) => (
                    <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {wd}
                    </div>
                  ))}
                </div>
                {/* Week rows */}
                {calendarGrid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                    {week.days.map((cell, di) => {
                      if (!cell) {
                        return <div key={di} className="h-[4.5rem] rounded-md" />
                      }
                      const showR = Math.abs(cell.realized) >= 0.005
                      const showU = (calendarAssetTab === 'all' || calendarAssetTab === 'options')
                        && Math.abs(cell.unrealized) >= 0.005
                      const hasData = showR || showU
                      const isSelected = selectedDay === cell.date
                      return (
                        <button
                          key={di}
                          onClick={() => setSelectedDay(isSelected ? null : cell.date)}
                          className={cn(
                            'relative h-[4.5rem] rounded-md border text-left p-1.5 transition-all',
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
                                  R {fmtMoney(cell.realized)}
                                </span>
                              )}
                              {showU && (
                                <span className="text-[10px] font-mono leading-tight block truncate text-blue-400 dark:text-blue-300">
                                  U {fmtMoney(cell.unrealized)}
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
          </CardContent>
        </Card>

        {/* Calendar Sidebar Stats */}
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Month Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Month PnL</p>
                <p className={cn('text-xl font-semibold tabular-nums', pnlColorClass(monthStats.monthPnl))}>
                  {fmtMoneyFull(monthStats.monthPnl)}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums">{monthStats.totalDays}</p>
                  <p className="text-xs text-muted-foreground">Trading</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {monthStats.winDays}
                  </p>
                  <p className="text-xs text-muted-foreground">Win</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {monthStats.lossDays}
                  </p>
                  <p className="text-xs text-muted-foreground">Loss</p>
                </div>
              </div>
              {monthStats.totalDays > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Win Rate (days)</p>
                    <p className="text-sm font-medium tabular-nums">
                      {fmtRawPct((monthStats.winDays / monthStats.totalDays) * 100)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Daily PnL</p>
                    <p className={cn('text-sm font-medium tabular-nums', pnlColorClass(monthStats.monthPnl / monthStats.totalDays))}>
                      {fmtMoneyFull(monthStats.monthPnl / monthStats.totalDays)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {selectedDay && selectedDayCalendar && (
            <Card>
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
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && selectedDayData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Day Detail — {selectedDay}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Sec Type</TableHead>
                  <TableHead className="text-right">Net PnL</TableHead>
                  <TableHead className="text-right">Gross PnL</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDayData.map((row) => (
                  <TableRow key={row.sec_type}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {secTypeLabel(row.sec_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums', pnlColorClass(row.net_pnl))}>
                      {fmtMoneyFull(row.net_pnl)}
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums', pnlColorClass(row.pnl))}>
                      {fmtMoneyFull(row.pnl)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmtMoneyFull(-Math.abs(row.commission))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.trade_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cumulative Curve */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Cumulative PnL</CardTitle>
        </CardHeader>
        <CardContent>
          {!curveData || curveData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground rounded-lg border border-dashed">
              No cumulative curve data for this range
            </div>
          ) : (
            <CumulativeBar data={curveData} />
          )}
        </CardContent>
      </Card>
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

function CumulativeBar({
  data,
}: {
  data: { ts: number; cumulative_net_pnl: number }[]
}) {
  const maxAbs = useMemo(() => {
    let m = 0
    for (const d of data) {
      const abs = Math.abs(d.cumulative_net_pnl)
      if (abs > m) m = abs
    }
    return m || 1
  }, [data])

  const finalPnl = data[data.length - 1]?.cumulative_net_pnl ?? 0

  return (
    <div className="space-y-3">
      {/* Summary line */}
      <div className="flex items-center gap-2">
        {finalPnl >= 0 ? (
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span className={cn('text-lg font-semibold tabular-nums', pnlColorClass(finalPnl))}>
          {fmtMoneyFull(finalPnl)}
        </span>
        <span className="text-xs text-muted-foreground">cumulative over {data.length} points</span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-px h-32">
        {data.map((d, i) => {
          const pct = Math.abs(d.cumulative_net_pnl) / maxAbs
          const heightPct = Math.max(pct * 100, 2)
          const isPositive = d.cumulative_net_pnl >= 0
          return (
            <div
              key={i}
              className="flex-1 min-w-[2px] group relative flex flex-col justify-end h-full"
            >
              <div
                className={cn(
                  'w-full rounded-t-sm transition-colors',
                  isPositive
                    ? 'bg-emerald-500/70 group-hover:bg-emerald-500'
                    : 'bg-red-500/70 group-hover:bg-red-500',
                )}
                style={{ height: `${heightPct}%` }}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-popover text-popover-foreground border rounded px-2 py-1 text-[10px] tabular-nums whitespace-nowrap shadow-md">
                  {fmtMoneyFull(d.cumulative_net_pnl)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{new Date(data[0].ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1].ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}
