import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
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

  return (
    <section className={cn(styles.sectionPane)} aria-label="Calendar">
      <h3 className={styles.sectionSubtitle}>
        Calendar
        <InfoTooltip text={CALENDAR_HELP} />
      </h3>
      <div className={styles.calendarWithSummary}>
        <div className={styles.calendarLeft}>
          <div className={styles.systemTabs} role="tablist" aria-label="Calendar asset class">
            {CALENDAR_ASSET_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={calendarAssetTab === id}
                className={cn(
                  styles.systemTab,
                  calendarAssetTab === id && styles.systemTabActive,
                )}
                onClick={() => {
                  onCalendarAssetTab(id)
                  onSelectedDay(null)
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {calendarAssetTab === 'options' && optUnrealized != null && (
            <p className="text-xs text-muted-foreground mb-2">
              Option Unrealized (as of now):{' '}
              <strong className={pnlColorClass(optUnrealized)}>{fmtUsd(optUnrealized)}</strong>
            </p>
          )}

          <div className={styles.calendarMonthNav}>
            <Button variant="outline" size="sm" className="h-8" onClick={() => onShiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <span className={styles.calendarMonthLabel}>{monthLabel}</span>
            <Button variant="outline" size="sm" className="h-8" onClick={() => onShiftMonth(1)} aria-label="Next month">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className={styles.legendPills}>
            <span className={cn(styles.legendPill, styles.legendRealized)}>R = Realized</span>
            {!isStkTab && (
              <span className={cn(styles.legendPill, styles.legendUnrealized)}>U = Unrealized</span>
            )}
            {isStkTab && (
              <span className={cn(styles.legendPill, styles.legendNotional)}>N = Notional</span>
            )}
          </div>

          {isLoading ? (
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
                    const showN = isStkTab && Math.abs(cell.notional) >= 0.005
                    const showU = !isStkTab && Math.abs(cell.unrealized) >= 0.005
                    const showR = Math.abs(cell.realized) >= 0.005 || showN
                    const hasData = showR || showU || showN
                    const isSelected = selectedDay === cell.date
                    const dayNet = cell.realized + (isStkTab ? 0 : cell.unrealized)
                    const isLossDay = hasData && dayNet <= LOSS_DAY_THRESHOLD
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
                        onClick={() => onSelectedDay(isSelected ? null : cell.date)}
                        className={cn(
                          styles.calendarCell,
                          hasData && styles.calendarCellHasData,
                          isSelected && styles.calendarCellSelected,
                          isLossDay && styles.calendarCellLoss,
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
                              <span className="text-[10px] font-mono leading-tight block truncate text-cyan-400">
                                U: {fmtMoney(cell.unrealized)}
                              </span>
                            )}
                            {showN && (
                              <span
                                className={cn(
                                  'text-[10px] font-mono leading-tight block truncate',
                                  calendarAssetTab === 'cash_like'
                                    ? 'text-violet-400'
                                    : cell.notional > 0
                                      ? 'text-emerald-400'
                                      : cell.notional < 0
                                        ? 'text-red-400'
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

          {selectedDay && bulk && (
            <div className="mt-4">
              <CalendarDayDetail
                selectedDay={selectedDay}
                calendarAssetTab={calendarAssetTab}
                rawExecsWindow={bulk.rawExecsWindow}
                linkByOptionId={bulk.linkByOptionId}
                positionCategoryByAccountContract={positionCategoryByAccountContract}
                onClose={() => onSelectedDay(null)}
              />
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
    </section>
  )
}
