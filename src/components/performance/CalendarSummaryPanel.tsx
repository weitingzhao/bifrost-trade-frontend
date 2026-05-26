import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import type {
  PerformanceSummary,
  PerformanceDayPnLCell,
  PerformanceDayPnLBulkResult,
  PerformanceResponse,
} from '@/types/trading'
import type { StkLedgerBucket } from '@/utils/ledger/stkBuckets'

// ─── Formatting ───

function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtPct1(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

function fmtPct2(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(2)}%`
}

function fmtPF(v: number | null | undefined): string {
  if (v == null) return '—'
  if (!Number.isFinite(v)) return '∞'
  return v.toFixed(2)
}

// ─── Types ───

type CalendarAssetTab = 'all' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'

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
  emphasize?: boolean
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

function MetricCell({ label, value, colorValue, emphasize }: MetricDef) {
  return (
    <div className="min-w-0 rounded-md bg-background/70 px-1.5 py-1">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
        {label}
      </span>
      <span
        className={cn(
          'block tabular-nums font-semibold leading-tight truncate',
          emphasize ? 'text-[13px]' : 'text-xs',
          colorValue != null ? pnlColorClass(colorValue) : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** Legacy performance-summary-row: type label + metrics flowing horizontally */
function SummaryMetricRow({
  title,
  metrics,
  accentTitle,
  empty,
  horizontalMetrics,
}: {
  title: string
  metrics: MetricDef[]
  accentTitle?: boolean
  empty?: boolean
  /** Summary row: all metrics in one horizontal flow (Legacy default row layout) */
  horizontalMetrics?: boolean
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-border/40 py-2 last:border-b-0">
      <span
        className={cn(
          'w-16 shrink-0 pt-0.5 text-xs font-bold',
          accentTitle ? 'text-primary' : 'text-foreground',
        )}
      >
        {title}
      </span>
      {empty ? (
        <p className="text-xs italic text-muted-foreground">No data in the selected range.</p>
      ) : (
        <div
          className={cn(
            'min-w-0 flex-1',
            horizontalMetrics
              ? 'flex flex-wrap gap-x-3 gap-y-1'
              : 'grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-x-2 gap-y-1',
          )}
        >
          {metrics.map((m) => (
            <MetricCell key={m.label} {...m} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Legacy inside-calendar column card (Option / Stocks / FI / Cash-like) */
function SummaryColumn({
  title,
  metrics,
  accentTitle,
  empty,
}: {
  title: string
  metrics: MetricDef[]
  accentTitle?: boolean
  empty?: boolean
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-muted/20 p-2">
      <p
        className={cn(
          'mb-1.5 text-xs font-bold tracking-wide',
          accentTitle ? 'text-primary' : 'text-foreground',
        )}
      >
        {title}
      </p>
      {empty ? (
        <p className="text-xs italic text-muted-foreground">No data in the selected range.</p>
      ) : (
        <div className="space-y-1">
          {metrics.map((m) => (
            <MetricCell key={m.label} {...m} />
          ))}
        </div>
      )}
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
    const tabKey = calendarAssetTab === 'all' ? 'options' : calendarAssetTab
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
      <div className="flex h-full min-h-[12rem] items-center justify-center rounded-xl border border-border/60 bg-muted/10 p-4">
        <p className="animate-pulse text-xs text-muted-foreground">Loading summary…</p>
      </div>
    )
  }

  if (!summary) return null

  const totalPnl = summary.total_pnl ?? (summary.net_pnl + summary.total_unrealized_pnl)

  const summaryMetrics: MetricDef[] = [
    { label: 'Total PnL', value: fmtUsd(totalPnl), colorValue: totalPnl, emphasize: true },
    { label: 'Realized', value: fmtUsd(summary.realized ?? summary.net_pnl) },
    { label: 'Net', value: fmtUsd(summary.net_pnl), colorValue: summary.net_pnl, emphasize: true },
    { label: 'Unrealized', value: fmtUsd(summary.total_unrealized_pnl) },
    { label: 'Comm', value: fmtUsd(summary.total_commission) },
    { label: 'Trades', value: String(summary.trade_count ?? 0) },
    { label: 'Win Rate', value: fmtPct1(summary.win_rate) },
    { label: 'Return%', value: fmtPct2(summary.return_pct) },
    { label: 'PF', value: fmtPF(summary.profit_factor) },
    {
      label: 'Max DD',
      value: summary.max_drawdown != null ? fmtUsd(-Math.abs(summary.max_drawdown)) : '—',
      colorValue: summary.max_drawdown != null ? -Math.abs(summary.max_drawdown) : undefined,
    },
    {
      label: 'Avg W/L',
      value: `${fmtUsd(summary.avg_win)} / ${fmtUsd(summary.avg_loss)}`,
    },
  ]

  const optionMetrics: MetricDef[] = [
    { label: 'Realized', value: fmtUsd(optRealizedPnl), colorValue: optRealizedPnl },
    { label: 'Comm', value: fmtUsd(rOpt?.commission ?? 0) },
    { label: 'Net', value: fmtUsd(optNetPnl), colorValue: optNetPnl },
    { label: 'Trades', value: String(rOpt?.trade_count ?? 0) },
    { label: 'Unrealized', value: fmtUsd(optUnrealizedPnl), colorValue: optUnrealizedPnl },
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
    <div className="flex h-full min-w-0 flex-col rounded-xl border border-border/60 bg-muted/10 p-3">
      {/* Legacy: Summary row — type + metrics in one horizontal flow */}
      <SummaryMetricRow
        title="Summary"
        metrics={summaryMetrics}
        accentTitle
        horizontalMetrics
      />

      {/* Legacy: Option | Stocks | FI in one row (3 columns), Cash-like below */}
      <div className="mt-1 grid grid-cols-3 gap-2">
        <SummaryColumn title="Option" metrics={optionMetrics} empty={!hasOpt} />
        <SummaryColumn
          title="Stocks"
          metrics={stocksMetrics.metrics}
          empty={!stocksMetrics.hasRow}
        />
        <SummaryColumn
          title="Fixed Income"
          metrics={fiMetrics.metrics}
          empty={!fiMetrics.hasRow}
        />
        <SummaryColumn
          title="Cash-like"
          metrics={cashMetrics.metrics}
          empty={!cashMetrics.hasRow}
        />
      </div>

      {monthStats && monthStats.totalDays > 0 && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <p className="mb-2 text-xs font-semibold text-foreground">{calendarMonth} Stats</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-semibold tabular-nums">{monthStats.totalDays}</p>
              <p className="text-[10px] text-muted-foreground">Trading</p>
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {monthStats.winDays}
              </p>
              <p className="text-[10px] text-muted-foreground">Win</p>
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                {monthStats.lossDays}
              </p>
              <p className="text-[10px] text-muted-foreground">Loss</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <MetricCell
              label="Win Rate"
              value={`${((monthStats.winDays / monthStats.totalDays) * 100).toFixed(1)}%`}
            />
            <MetricCell
              label="Avg Daily"
              value={fmtUsd(monthStats.monthPnl / monthStats.totalDays)}
              colorValue={monthStats.monthPnl / monthStats.totalDays}
            />
            <MetricCell
              label="Month PnL"
              value={fmtUsd(monthStats.monthPnl)}
              colorValue={monthStats.monthPnl}
            />
          </div>
        </div>
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
        label: 'Notional',
        value: useBulk ? fmtUsd(nVal) : '—',
        colorValue: useBulk ? nVal : undefined,
      },
      { label: 'Comm', value: useBulk ? '—' : fmtUsd(fallbackCommission) },
      { label: 'Net', value: fmtUsd(netVal), colorValue: netVal },
      { label: 'Trades', value: useBulk ? '—' : String(fallbackTrades) },
    ].map((m) =>
      m.label === 'Notional' && useBulk
        ? {
            ...m,
            colorValue: notionalSignedTone ? nVal : undefined,
          }
        : m,
    ),
  }
}
