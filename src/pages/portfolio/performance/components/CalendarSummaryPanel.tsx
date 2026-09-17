import { fmtUsd } from '@/lib/format'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass, unrealizedPnlColorClass } from '@/utils/dailyChange'
import type {
  PerformanceSummary,
  PerformanceDayPnLCell,
  PerformanceDayPnLBulkResult,
  PerformanceResponse,
} from '@/types/trading'
import type { StkLedgerBucket } from '@/utils/ledger/stkBuckets'
import { perfUi } from '@/pages/portfolio/performance/performanceUi'

// ─── Formatting ───

// ─── Types ───

type CalendarAssetTab = 'options' | 'stocks' | 'fixed_income' | 'cash_like'

interface CalendarSummaryPanelProps {
  summary: PerformanceSummary | undefined
  perf: PerformanceResponse | undefined
  bulk: PerformanceDayPnLBulkResult | undefined
  calendarMonth: string
  calendarAssetTab: CalendarAssetTab
  isLoading: boolean
}

interface MetricDef {
  label: string
  value: string
  colorValue?: number | null
  /** When set, value uses site-wide unrealized yellow instead of PnL green/red. */
  valueTone?: 'pnl' | 'unrealized'
  emphasize?: boolean
  valueClassName?: string
}

// ─── Helpers ───

function sumBucketMonth(
  calendarDayPnLByAsset: Record<string, Record<string, PerformanceDayPnLCell>> | undefined,
  tab: 'options' | StkLedgerBucket,
): { r: number; u: number } {
  const rec = calendarDayPnLByAsset?.[tab]
  if (!rec) return { r: 0, u: 0 }
  return Object.values(rec).reduce(
    (a, d) => ({ r: a.r + (d.realized ?? 0), u: a.u + (d.unrealized ?? 0) }),
    { r: 0, u: 0 },
  )
}

function sumNotionalMonth(
  calendarStkNotionalByBucket: Record<string, Record<string, number>> | undefined,
  tab: StkLedgerBucket,
): number {
  const rec = calendarStkNotionalByBucket?.[tab]
  if (!rec) return 0
  return Object.values(rec).reduce((a, n) => a + n, 0)
}

// ─── Sub-components ───

function toneFor({ colorValue, valueTone = 'pnl', valueClassName }: MetricDef): string {
  if (valueClassName) return valueClassName
  if (colorValue == null) return 'text-foreground/85'
  return valueTone === 'unrealized' ? unrealizedPnlColorClass(colorValue) : pnlColorClass(colorValue)
}

/** One asset class for the month: a card of label · value lines. */
function SummaryColumn({
  title,
  metrics,
  empty,
}: {
  title: string
  metrics: MetricDef[]
  empty?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-sm border border-border px-2.25 py-1.75">
      <span className="text-dense-body font-semibold text-foreground">{title}</span>
      {empty ? (
        <span className="text-dense-meta italic text-muted-foreground text-pretty">No data in the selected range.</span>
      ) : (
        metrics.map((m) => (
          <span key={m.label} className="flex items-baseline gap-1.5">
            <span className={cn(perfUi.cap, 'min-w-0 flex-1 text-dense-micro')}>{m.label}</span>
            <span className={cn(perfUi.mono, 'text-dense-body font-semibold', toneFor(m))}>{m.value}</span>
          </span>
        ))
      )}
    </div>
  )
}

/** The month's day counts beside the calendar — days, not trades (Design F1). */
function MonthStats({ monthKey, metrics }: { monthKey: string; metrics: MetricDef[] }) {
  return (
    <div className="flex flex-wrap items-stretch gap-1.5 border-t border-border/60 pt-2">
      <span className="flex min-w-19 flex-col justify-center">
        <span className={perfUi.cap}>{monthKey}</span>
        <span className="text-dense-meta text-muted-foreground">month stats</span>
      </span>
      {metrics.map((m) => (
        <span key={m.label} className="flex min-w-0 flex-col gap-px rounded-sm border border-border px-2 py-1.25">
          <span className={cn(perfUi.cap, 'text-dense-micro')}>{m.label}</span>
          <span className={cn(perfUi.mono, 'text-dense-body font-semibold', toneFor(m))}>{m.value}</span>
        </span>
      ))}
    </div>
  )
}

// ─── Main Component ───

export function CalendarSummaryPanel({
  summary,
  perf,
  bulk,
  calendarMonth,
  calendarAssetTab,
  isLoading,
}: CalendarSummaryPanelProps) {
  const calendarDayPnLByAsset = bulk?.calendarDayPnLByAsset
  const calendarStkNotionalByBucket = bulk?.calendarStkNotionalByBucket

  const hasCalendar = calendarDayPnLByAsset != null
    && Object.keys(calendarDayPnLByAsset).length > 0

  const realized = perf?.realized_by_sec_type ?? []
  const unrealized = perf?.unrealized_by_sec_type ?? []

  const rOpt = realized.find((x) => x.sec_type === 'OPT')
  const uOpt = unrealized.find((x) => x.sec_type === 'OPT')
  const rStk = realized.find((x) => x.sec_type === 'STK')

  const optM = useMemo(
    () => sumBucketMonth(calendarDayPnLByAsset, 'options'),
    [calendarDayPnLByAsset],
  )
  const stocksM = useMemo(
    () => sumBucketMonth(calendarDayPnLByAsset, 'stocks'),
    [calendarDayPnLByAsset],
  )
  const fiM = useMemo(
    () => sumBucketMonth(calendarDayPnLByAsset, 'fixed_income'),
    [calendarDayPnLByAsset],
  )
  const cashM = useMemo(
    () => sumBucketMonth(calendarDayPnLByAsset, 'cash_like'),
    [calendarDayPnLByAsset],
  )

  const stocksNMonth = useMemo(
    () => sumNotionalMonth(calendarStkNotionalByBucket, 'stocks'),
    [calendarStkNotionalByBucket],
  )
  const fiNMonth = useMemo(
    () => sumNotionalMonth(calendarStkNotionalByBucket, 'fixed_income'),
    [calendarStkNotionalByBucket],
  )
  const cashNMonth = useMemo(
    () => sumNotionalMonth(calendarStkNotionalByBucket, 'cash_like'),
    [calendarStkNotionalByBucket],
  )

  const optRealizedPnl = hasCalendar ? optM.r : (rOpt?.total_pnl ?? 0)
  const optUnrealizedPnl = hasCalendar ? optM.u : (uOpt?.total_pnl ?? 0)
  const optNetPnl = hasCalendar
    ? optM.r - (rOpt?.commission ?? 0)
    : (rOpt?.net_pnl ?? 0)
  const hasOpt = hasCalendar || rOpt != null || uOpt != null

  const monthStats = useMemo(() => {
    if (!calendarDayPnLByAsset) return null
    const tabKey = calendarAssetTab
    const rec = calendarDayPnLByAsset[tabKey]
    if (!rec) return null

    let totalDays = 0
    let winDays = 0
    let lossDays = 0
    let monthPnl = 0
    for (const [date, data] of Object.entries(rec)) {
      if (!date.startsWith(calendarMonth)) continue
      const net = data.realized + data.unrealized
      if (Math.abs(data.realized) >= 0.005 || Math.abs(data.unrealized) >= 0.005) {
        totalDays++
        if (net > 0) winDays++
        else if (net < 0) lossDays++
      }
      monthPnl += net
    }
    return { totalDays, winDays, lossDays, monthPnl }
  }, [calendarDayPnLByAsset, calendarMonth, calendarAssetTab])

  if (isLoading) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <p className="animate-pulse text-xs text-muted-foreground">Loading summary…</p>
      </div>
    )
  }

  if (!summary) return null

  // Prototype order; unrealized and unpaired premium carry no direction colour.
  const unpaired = bulk?.optAsOf?.openUnrealized
  const optionMetrics: MetricDef[] = [
    { label: 'Realized', value: fmtUsd(optRealizedPnl), colorValue: optRealizedPnl },
    ...(unpaired != null
      ? [{ label: 'Unpaired premium', value: fmtUsd(unpaired), valueClassName: 'text-secondary-foreground' }]
      : []),
    { label: 'Unrealized', value: fmtUsd(optUnrealizedPnl), valueClassName: 'text-secondary-foreground' },
    { label: 'Comm', value: fmtUsd(rOpt?.commission ?? 0), valueClassName: 'text-muted-foreground' },
    { label: 'Net', value: fmtUsd(optNetPnl), colorValue: optNetPnl },
    { label: 'Trades', value: String(rOpt?.trade_count ?? 0) },
  ]

  const stocksMetrics = buildStkBucketMetrics({
    hasCalendar,
    hasCalendarNotional: calendarStkNotionalByBucket != null,
    monthRealized: stocksM.r,
    monthNotional: stocksNMonth,
    fallbackRealized: rStk?.total_pnl ?? 0,
    fallbackCommission: rStk?.commission ?? 0,
    fallbackNet: rStk?.net_pnl ?? 0,
    fallbackTrades: rStk?.trade_count ?? 0,
    showFallback: rStk != null,
    notionalSignedTone: true,
  })

  const fiMetrics = buildStkBucketMetrics({
    hasCalendar,
    hasCalendarNotional: calendarStkNotionalByBucket != null,
    monthRealized: fiM.r,
    monthNotional: fiNMonth,
    fallbackRealized: 0,
    fallbackCommission: 0,
    fallbackNet: 0,
    fallbackTrades: 0,
    showFallback: false,
    notionalSignedTone: true,
    notionalLabel: 'Stream',
  })

  const cashMetrics = buildStkBucketMetrics({
    hasCalendar,
    hasCalendarNotional: calendarStkNotionalByBucket != null,
    monthRealized: cashM.r,
    monthNotional: cashNMonth,
    fallbackRealized: 0,
    fallbackCommission: 0,
    fallbackNet: 0,
    fallbackTrades: 0,
    showFallback: false,
    notionalSignedTone: false,
  })

  return (
    <div className="flex min-w-0 flex-col gap-2.5 px-3 pt-2.5 pb-3">
      {/* The range-level metrics moved to Reading (Design F1); by asset class stays here. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.375rem),1fr))] gap-1.5">
        <SummaryColumn title="Option" metrics={optionMetrics} empty={!hasOpt} />
        <SummaryColumn title="Stocks" metrics={stocksMetrics.metrics} empty={!stocksMetrics.hasRow} />
        <SummaryColumn title="Fixed income stream" metrics={fiMetrics.metrics} empty={!fiMetrics.hasRow} />
        <SummaryColumn title="Cash-like" metrics={cashMetrics.metrics} empty={!cashMetrics.hasRow} />
      </div>

      {monthStats && monthStats.totalDays > 0 && (
        <MonthStats
          monthKey={calendarMonth}
          metrics={[
            { label: 'Active days', value: String(monthStats.totalDays) },
            { label: 'Win days', value: String(monthStats.winDays), valueClassName: 'text-profit' },
            { label: 'Loss days', value: String(monthStats.lossDays), valueClassName: 'text-loss' },
            {
              label: 'Win days %',
              value: `${((monthStats.winDays / monthStats.totalDays) * 100).toFixed(1)}%`,
            },
            {
              label: 'Avg daily',
              value: fmtUsd(monthStats.monthPnl / monthStats.totalDays),
              colorValue: monthStats.monthPnl / monthStats.totalDays,
            },
            { label: 'Month P&L', value: fmtUsd(monthStats.monthPnl), colorValue: monthStats.monthPnl },
          ]}
        />
      )}
    </div>
  )
}

function buildStkBucketMetrics({
  hasCalendar,
  hasCalendarNotional,
  monthRealized,
  monthNotional,
  fallbackRealized,
  fallbackCommission,
  fallbackNet,
  fallbackTrades,
  showFallback,
  notionalSignedTone,
  notionalLabel = 'Notional',
}: {
  hasCalendar: boolean
  hasCalendarNotional: boolean
  monthRealized: number
  monthNotional: number
  fallbackRealized: number
  fallbackCommission: number
  fallbackNet: number
  fallbackTrades: number
  showFallback: boolean
  notionalSignedTone: boolean
  notionalLabel?: string
}): { hasRow: boolean; metrics: MetricDef[] } {
  const useBulk = hasCalendar && hasCalendarNotional
  const rVal = useBulk ? monthRealized : fallbackRealized
  const nVal = useBulk ? monthNotional : 0

  const hasRow = useBulk
    ? Math.abs(monthRealized) >= 0.005 || Math.abs(monthNotional) >= 0.005
    : showFallback && Math.abs(fallbackRealized) >= 0.005

  if (!hasRow) {
    return { hasRow: false, metrics: [] }
  }

  const netVal = useBulk ? rVal : fallbackNet

  return {
    hasRow: true,
    metrics: [
      { label: 'Realized', value: fmtUsd(rVal), colorValue: rVal },
      {
        label: notionalLabel,
        value: useBulk ? fmtUsd(nVal) : '—',
        colorValue: useBulk ? nVal : undefined,
      },
      { label: 'Comm', value: useBulk ? '—' : fmtUsd(fallbackCommission) },
      { label: 'Net', value: fmtUsd(netVal), colorValue: netVal },
      { label: 'Trades', value: useBulk ? '—' : String(fallbackTrades) },
    ].map((m) =>
      m.label === notionalLabel && useBulk
        ? {
            ...m,
            colorValue: notionalSignedTone ? nVal : undefined,
          }
        : m,
    ),
  }
}
