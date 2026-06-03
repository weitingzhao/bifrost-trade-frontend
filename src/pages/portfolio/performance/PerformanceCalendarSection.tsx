import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import type { PerformanceDayPnLBulkResult, PerformanceResponse } from '@/types/trading'
import type { PerformanceSummary } from '@/types/trading'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarSummaryPanel } from '@/components/performance/CalendarSummaryPanel'
import { CalendarDayDetail } from '@/components/performance/CalendarDayDetail'
import {
  buildCalendarGrid,
  CALENDAR_ASSET_TABS,
  WEEKDAY_LABELS,
  type CalendarAssetTab,
} from './performanceCalendarModel'
import { CALENDAR_HELP } from './performanceConstants'
import { fmtMoney, fmtMoneyFull, fmtUsd } from './performanceFormatters'
import styles from '@/components/performance/performanceCalendar.module.css'

const LOSS_DAY_THRESHOLD = -500

function calendarRealizedToneClass(value: number): string {
  if (Math.abs(value) < 0.005) return styles.calendarCellToneMuted
  return value >= 0 ? styles.calendarCellTonePositive : styles.calendarCellToneNegative
}

function calendarNotionalToneClass(assetTab: CalendarAssetTab, value: number): string {
  if (assetTab === 'cash_like') return styles.calendarCellToneNotionalCash
  if (value > 0) return styles.calendarCellToneNotionalPos
  if (value < 0) return styles.calendarCellToneNotionalNeg
  return styles.calendarCellToneMuted
}

function CalendarCellMetric({
  label,
  value,
  toneClass,
  emphasized = false,
}: {
  label: string
  value: string
  toneClass: string
  emphasized?: boolean
}) {
  return (
    <span className={cn(styles.calendarCellMetric, emphasized && styles.calendarCellMetricEmphasis)}>
      <span className={styles.calendarCellMetricLabel}>{label}</span>
      <span className={cn(styles.calendarCellMetricValue, toneClass)}>{value}</span>
    </span>
  )
}

interface PerformanceCalendarSectionProps {
  calendarMonth: string
  calendarAssetTab: CalendarAssetTab
  onCalendarAssetTab: (tab: CalendarAssetTab) => void
  onShiftMonth: (delta: number) => void
  calendarGrid: ReturnType<typeof buildCalendarGrid>
  selectedDay: string | null
  onSelectedDay: (day: string | null) => void
  summary: PerformanceSummary | undefined
  perf: PerformanceResponse | undefined
  bulk: PerformanceDayPnLBulkResult | undefined
  isLoading: boolean
  positionCategoryByAccountContract: Map<string, string>
}

export function PerformanceCalendarSection({
  calendarMonth,
  calendarAssetTab,
  onCalendarAssetTab,
  onShiftMonth,
  calendarGrid,
  selectedDay,
  onSelectedDay,
  summary,
  perf,
  bulk,
  isLoading,
  positionCategoryByAccountContract,
}: PerformanceCalendarSectionProps) {
  const monthLabel = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [calendarMonth])

  const optUnrealized = useMemo(() => {
    return (perf?.unrealized_by_sec_type ?? []).find((u) => u.sec_type === 'OPT')?.total_pnl ?? null
  }, [perf?.unrealized_by_sec_type])

  const isStkTab = calendarAssetTab !== 'options'
  const isFiStreamTab = calendarAssetTab === 'fixed_income'
  const flowMetricLabel = isFiStreamTab ? 'S' : 'N'
  const flowMetricLegend = isFiStreamTab ? 'S = Stream' : 'N = Notional'

  return (
    <section className={cn(styles.sectionPane)} aria-label="Calendar">
      <h3 className={styles.sectionSubtitle}>
        Calendar
        <InfoTooltip text={CALENDAR_HELP} />
      </h3>
      <div className={styles.calendarWithSummary}>
        <div className={styles.calendarLeft}>
          <div className={styles.calendarToolbar}>
            <div className={styles.systemTabs} role="tablist" aria-label="Calendar asset class">
              {CALENDAR_ASSET_TABS.map(({ id, label, tabLabel }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={calendarAssetTab === id}
                  title={tabLabel ? label : undefined}
                  className={cn(
                    styles.systemTab,
                    calendarAssetTab === id && styles.systemTabActive,
                  )}
                  onClick={() => {
                    onCalendarAssetTab(id)
                    onSelectedDay(null)
                  }}
                >
                  {tabLabel ?? label}
                </button>
              ))}
            </div>

            <div className={cn(styles.calendarMonthNav, styles.calendarMonthNavCompact)}>
              <Button
                variant="outline"
                size="sm"
                className="h-[1.625rem] px-2 text-[11px]"
                onClick={() => onShiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3 w-3 mr-0.5" />
                Prev
              </Button>
              <span className={styles.calendarMonthLabel}>{monthLabel}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-[1.625rem] px-2 text-[11px]"
                onClick={() => onShiftMonth(1)}
                aria-label="Next month"
              >
                Next
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>

            <div className={styles.legendPills}>
              <span className={cn(styles.legendPill, styles.legendRealized)}>R = Realized</span>
              {!isStkTab && (
                <span className={cn(styles.legendPill, styles.legendUnrealized)}>U = Unrealized</span>
              )}
              {isStkTab && (
                <span className={cn(styles.legendPill, styles.legendNotional)}>{flowMetricLegend}</span>
              )}
            </div>
          </div>

          {calendarAssetTab === 'options' && optUnrealized != null && (
            <p className={styles.calendarOptUnrealized}>
              Option Unrealized (as of now):{' '}
              <strong className={unrealizedPnlColorClass(optUnrealized)}>{fmtUsd(optUnrealized)}</strong>
            </p>
          )}

          {isLoading ? (
            <Skeleton className="min-h-[10rem] flex-1 rounded-lg" />
          ) : (
            <div className={styles.calendarBody}>
              <div className={cn(styles.calendarGrid, styles.calendarGridHeader)}>
                {WEEKDAY_LABELS.map((wd) => (
                  <div key={wd} className={styles.calendarWeekday}>
                    {wd}
                  </div>
                ))}
              </div>
              <div className={styles.calendarWeeks}>
                {calendarGrid.map((week, wi) => (
                  <div key={wi} className={cn(styles.calendarGrid, styles.calendarGridWeek)}>
                    {week.days.map((cell, di) => {
                    if (!cell) {
                      return <div key={di} className={styles.calendarCellEmpty} />
                    }
                    const showN = isStkTab && Math.abs(cell.notional) >= 0.005
                    const showU = !isStkTab && Math.abs(cell.unrealized) >= 0.005
                    const showR = Math.abs(cell.realized) >= 0.005 || showN
                    const hasData = showR || showU || showN
                    const pnlLineCount = [showR, showU, showN].filter(Boolean).length
                    const emphasizeMetrics = pnlLineCount === 1
                    const isSelected = selectedDay === cell.date
                    const dayNet = cell.realized + (isStkTab ? 0 : cell.unrealized)
                    const isLossDay = hasData && dayNet <= LOSS_DAY_THRESHOLD
                    const titleParts: string[] = []
                    if (isStkTab) {
                      titleParts.push(`Realized: ${fmtMoneyFull(cell.realized)}`)
                      titleParts.push(
                        `${isFiStreamTab ? 'Stream' : 'Notional'}: ${fmtMoneyFull(cell.notional)}`,
                      )
                    } else {
                      titleParts.push(`Realized: ${fmtMoneyFull(cell.realized)}`)
                      titleParts.push(`Unrealized: ${fmtMoneyFull(cell.unrealized)}`)
                    }
                    return (
                      <button
                        key={di}
                        type="button"
                        title={titleParts.join('\n')}
                        onClick={() => onSelectedDay(isSelected ? null : cell.date)}
                        className={cn(
                          styles.calendarCell,
                          hasData && styles.calendarCellHasData,
                          isSelected && styles.calendarCellSelected,
                          isLossDay && styles.calendarCellLoss,
                        )}
                      >
                        <div className={styles.calendarCellHeader}>
                          <span className={styles.calendarCellDay}>{cell.dayNum}</span>
                        </div>
                        {hasData && (
                          <div className={styles.calendarCellBody}>
                            <div className={styles.calendarCellMetricsBlock}>
                              {showR && (
                                <CalendarCellMetric
                                  label="R"
                                  value={fmtMoney(cell.realized)}
                                  toneClass={calendarRealizedToneClass(cell.realized)}
                                  emphasized={emphasizeMetrics}
                                />
                              )}
                              {showU && (
                                <CalendarCellMetric
                                  label="U"
                                  value={fmtMoney(cell.unrealized)}
                                  toneClass={styles.calendarCellToneUnrealized}
                                  emphasized={emphasizeMetrics}
                                />
                              )}
                              {showN && (
                                <CalendarCellMetric
                                  label={flowMetricLabel}
                                  value={fmtMoney(cell.notional)}
                                  toneClass={calendarNotionalToneClass(calendarAssetTab, cell.notional)}
                                  emphasized={emphasizeMetrics}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.calendarRight}>
          <CalendarSummaryPanel
            summary={summary}
            perf={perf}
            bulk={bulk}
            calendarMonth={calendarMonth}
            calendarAssetTab={calendarAssetTab}
            isLoading={isLoading}
          />
        </div>
      </div>

      {selectedDay && bulk && (
        <div className="mt-3">
          <CalendarDayDetail
            key={selectedDay}
            selectedDay={selectedDay}
            calendarAssetTab={calendarAssetTab}
            rawExecsWindow={bulk.rawExecsWindow}
            linkByOptionId={bulk.linkByOptionId}
            positionCategoryByAccountContract={positionCategoryByAccountContract}
            onClose={() => onSelectedDay(null)}
          />
        </div>
      )}
    </section>
  )
}
