import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtIsoDateToken } from '@/lib/format'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import type { PerformanceDayPnLBulkResult, PerformanceResponse } from '@/types/trading'
import type { PerformanceSummary } from '@/types/trading'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { DenseTag, SegmentControl, type SegmentOption } from '@/components/data-display'
import { CalendarSummaryPanel } from '@/pages/portfolio/performance/components/CalendarSummaryPanel'
import { CalendarDayDetail } from '@/pages/portfolio/performance/components/CalendarDayDetail'
import {
  buildCalendarGrid,
  CALENDAR_ASSET_TABS,
  WEEKDAY_LABELS,
  type CalendarAssetTab,
} from './performanceCalendarModel'
import { CALENDAR_HELP } from './performanceConstants'
import { fmtMoney, fmtMoneyFull, fmtUsd } from './performanceFormatters'
import { perfUi } from './performanceUi'
import styles from '@/pages/portfolio/performance/components/performanceCalendar.module.css'

const CALENDAR_ASSET_SEGMENT_OPTIONS: SegmentOption[] = CALENDAR_ASSET_TABS.map(t => ({
  value: t.id,
  label: t.tabLabel ?? t.label,
}))

const LOSS_DAY_THRESHOLD = -500

const btn = cn(
  'inline-flex h-5.5 cursor-pointer items-center gap-1.25 whitespace-nowrap rounded-sm border border-border bg-transparent px-1.75',
  'text-dense-meta text-foreground/80 hover:bg-secondary hover:text-foreground disabled:cursor-default disabled:opacity-50',
)

function tabBtn(active: boolean, enabled = true): string {
  return cn(
    btn,
    active ? 'border-primary text-primary' : enabled ? '' : 'text-muted-foreground',
  )
}

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

/**
 * The calendar and, beside it, one slot with two faces: Summary by asset class
 * for the month, or the records of the day just clicked. Never a third surface,
 * never over the calendar.
 */
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
  const [rightTab, setRightTab] = useState<'summary' | 'records'>('summary')

  const monthLabel = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }, [calendarMonth])

  const optUnrealized = useMemo(() => {
    return (perf?.unrealized_by_sec_type ?? []).find((u) => u.sec_type === 'OPT')?.total_pnl ?? null
  }, [perf?.unrealized_by_sec_type])

  const isStkTab = calendarAssetTab !== 'options'
  const isFiStreamTab = calendarAssetTab === 'fixed_income'
  const flowMetricLabel = isFiStreamTab ? 'S' : 'N'
  const flowMetricLegend = isFiStreamTab ? 'S = Stream' : 'N = Notional'

  /** Days in this month that carry a reading on the current layer, for ↑ / ↓. */
  const activeDays = useMemo(() => {
    const out: string[] = []
    for (const week of calendarGrid) {
      for (const cell of week.days) {
        if (!cell) continue
        const has = Math.abs(cell.realized) >= 0.005
          || (!isStkTab && Math.abs(cell.unrealized) >= 0.005)
          || (isStkTab && Math.abs(cell.notional) >= 0.005)
        if (has) out.push(cell.date)
      }
    }
    return out.sort()
  }, [calendarGrid, isStkTab])

  const showRecords = selectedDay != null && rightTab === 'records'

  function openDay(date: string | null) {
    onSelectedDay(date)
    setRightTab(date ? 'records' : 'summary')
  }

  function stepDay(delta: number) {
    if (!selectedDay) return
    const i = activeDays.indexOf(selectedDay)
    const next = activeDays[i + delta]
    if (next) onSelectedDay(next)
  }

  const selectedWeekday = selectedDay
    ? WEEKDAY_LABELS[new Date(`${selectedDay}T12:00:00`).getDay()]
    : null

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,32.5rem),1fr))] items-start gap-3">
      <section className={perfUi.panel} aria-label="Calendar">
        <header className={perfUi.panelHead}>
          <span className={perfUi.cap}>Calendar</span>
          <span className="flex items-center gap-0.5">
            <button type="button" className={btn} onClick={() => onShiftMonth(-1)} aria-label="Previous month">
              ‹ Prev
            </button>
            <span className="min-w-29 text-center text-dense-label font-semibold">{monthLabel}</span>
            <button type="button" className={btn} onClick={() => onShiftMonth(1)} aria-label="Next month">
              Next ›
            </button>
          </span>
          <span className="ml-auto flex gap-1.5">
            <DenseTag variant="success" size="cell">R = Realized</DenseTag>
            {isStkTab ? (
              <DenseTag variant="neutral" size="cell">{flowMetricLegend}</DenseTag>
            ) : (
              <DenseTag variant="category" size="cell">U = Unrealized</DenseTag>
            )}
          </span>
        </header>

        <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
          <SegmentControl
            size="xs"
            options={CALENDAR_ASSET_SEGMENT_OPTIONS}
            value={calendarAssetTab}
            onChange={v => {
              onCalendarAssetTab(v as CalendarAssetTab)
              openDay(null)
            }}
            ariaLabel="Calendar asset class"
          />

          {calendarAssetTab === 'options' && optUnrealized != null && (
            <p className="m-0 text-dense-meta text-muted-foreground">
              Option unrealized, as of now:{' '}
              <strong className={cn(perfUi.mono, unrealizedPnlColorClass(optUnrealized))}>{fmtUsd(optUnrealized)}</strong>
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
                      const titleParts: string[] = [fmtIsoDateToken(cell.date)]
                      titleParts.push(`Realized: ${fmtMoneyFull(cell.realized)}`)
                      if (isStkTab) {
                        titleParts.push(`${isFiStreamTab ? 'Stream' : 'Notional'}: ${fmtMoneyFull(cell.notional)}`)
                      } else {
                        titleParts.push(`Unrealized: ${fmtMoneyFull(cell.unrealized)}`)
                      }
                      if (hasData) titleParts.push("Click for the day's records")
                      return (
                        <button
                          key={di}
                          type="button"
                          title={titleParts.join('\n')}
                          onClick={() => openDay(isSelected ? null : cell.date)}
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

          <p className="m-0 inline-flex flex-wrap items-center gap-1 text-dense-meta leading-normal text-muted-foreground text-pretty">
            {isStkTab
              ? `R is broker-realized P&L on the day's fills; ${isFiStreamTab ? 'S is money in and out of the bucket' : 'N is signed trade size'}. An empty cell is no fill, not a flat day.`
              : "R is realized on pairs closed that day; U is that day's unmatched premium — a path figure, not open P&L. Two kinds of number, never added. An empty cell is no fill, not a flat day."}
            <InfoTooltip text={CALENDAR_HELP} />
          </p>
        </div>
      </section>

      <section className={perfUi.panel} aria-label="Summary and day records">
        <header className={perfUi.panelHead}>
          <span className="flex gap-1">
            <button type="button" className={tabBtn(!showRecords)} onClick={() => setRightTab('summary')}>
              Summary
            </button>
            <button
              type="button"
              className={tabBtn(showRecords, selectedDay != null)}
              onClick={() => setRightTab(selectedDay ? 'records' : 'summary')}
              title={selectedDay ? `The fills behind ${fmtIsoDateToken(selectedDay)}` : 'Click a day in the calendar'}
            >
              {selectedDay ? `Records · ${fmtIsoDateToken(selectedDay)}` : 'Records · pick a day'}
            </button>
          </span>
          <span className="min-w-0 flex-[1_1_9rem] text-dense-body text-muted-foreground">
            {showRecords
              ? `${selectedWeekday} · every fill, its FIFO pair, and the linked stock`
              : `by asset class · ${monthLabel}`}
          </span>
          {showRecords && (
            <span className="flex gap-1">
              <button
                type="button"
                className={btn}
                onClick={() => stepDay(-1)}
                disabled={activeDays.indexOf(selectedDay) <= 0}
                title="Previous day with a reading"
                aria-label="Previous day with a reading"
              >
                ↑
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => stepDay(1)}
                disabled={activeDays.indexOf(selectedDay) >= activeDays.length - 1}
                title="Next day with a reading"
                aria-label="Next day with a reading"
              >
                ↓
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => openDay(null)}
                title="Back to Summary"
                aria-label="Close the day's records"
              >
                ✕
              </button>
            </span>
          )}
        </header>

        {showRecords && bulk ? (
          <CalendarDayDetail
            key={selectedDay}
            selectedDay={selectedDay}
            calendarAssetTab={calendarAssetTab}
            rawExecsWindow={bulk.rawExecsWindow}
            linkByOptionId={bulk.linkByOptionId}
            positionCategoryByAccountContract={positionCategoryByAccountContract}
          />
        ) : (
          <CalendarSummaryPanel
            summary={summary}
            perf={perf}
            bulk={bulk}
            calendarMonth={calendarMonth}
            calendarAssetTab={calendarAssetTab}
            isLoading={isLoading}
          />
        )}
      </section>
    </div>
  )
}
