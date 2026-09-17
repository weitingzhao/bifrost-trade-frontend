import { useEffect, useMemo, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { fmtIsoDateToken } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
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
import { fmtMoneyFull } from './performanceFormatters'
import { buildDayStats, fmtCellMoney, type DayStat } from './performanceDayRecords'
import { perfUi } from './performanceUi'

const CALENDAR_ASSET_SEGMENT_OPTIONS: SegmentOption[] = CALENDAR_ASSET_TABS.map(t => ({
  value: t.id,
  label: t.tabLabel ?? t.label,
}))

/** Prototype `.pf-btn`. */
const btn = cn(
  'inline-flex h-5.5 cursor-pointer items-center gap-1.25 whitespace-nowrap rounded-sm border border-border bg-transparent px-1.75',
  'text-dense-meta text-secondary-foreground hover:bg-[var(--sk-surface)] hover:text-foreground disabled:cursor-default disabled:opacity-50',
)

function tabBtn(active: boolean, enabled = true): string {
  return cn(btn, active ? 'border-[var(--sk-accent)] text-[var(--sk-accent)]' : enabled ? '' : 'text-muted-foreground')
}

function statTone(s: DayStat): string {
  if (s.tone === 'pnl') return pnlColorClass(s.raw)
  if (s.tone === 'soft') return 'text-secondary-foreground'
  if (s.tone === 'muted') return 'text-muted-foreground'
  return 'text-foreground'
}

/** One line in a calendar cell: a one-letter label and the figure, right-aligned (prototype `.pf-ru`). */
function CellFigure({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className="flex items-baseline justify-end gap-1.25 font-mono text-dense-caption tabular-nums">
      <span className="text-dense-micro text-muted-foreground">{label}</span>
      <span className={tone}>{fmtCellMoney(value)}</span>
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
  /** Which face the slot beside the calendar shows; the page owns it so the audit table can open a day. */
  rightTab: 'summary' | 'records'
  onRightTab: (tab: 'summary' | 'records') => void
  slotRef?: Ref<HTMLElement>
  /** First day of the range, `YYYY-MM-DD`. */
  rangeStart: string
  /** `this quarter`, `year` … */
  rangeLabel: string
  /** Open the Day cell derivation. */
  onExplainCell?: () => void
}

/**
 * The calendar and, beside it, one slot with two faces: Summary by asset class
 * for the range, or the records of the day just clicked. Never a third surface,
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
  rightTab,
  onRightTab: setRightTab,
  slotRef,
  rangeStart,
  rangeLabel,
  onExplainCell,
}: PerformanceCalendarSectionProps) {
  const monthLabel = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }, [calendarMonth])

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
  const dayStats = useMemo(() => (selectedDay ? buildDayStats(bulk, selectedDay) : []), [bulk, selectedDay])

  function openDay(date: string | null) {
    onSelectedDay(date)
    setRightTab(date ? 'records' : 'summary')
  }

  function stepDay(delta: number) {
    if (!selectedDay) return
    const i = activeDays.indexOf(selectedDay)
    const next = activeDays[Math.max(0, Math.min(activeDays.length - 1, i + delta))]
    if (next) onSelectedDay(next)
  }

  // j / k walk the days with a reading, Esc returns to Summary — as the prototype does.
  useEffect(() => {
    if (!showRecords) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'Escape') {
        onSelectedDay(null)
        setRightTab('summary')
      } else if (e.key === 'j' || e.key === 'k') {
        const i = selectedDay ? activeDays.indexOf(selectedDay) : -1
        const next = activeDays[Math.max(0, Math.min(activeDays.length - 1, i + (e.key === 'j' ? 1 : -1)))]
        if (next) onSelectedDay(next)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showRecords, selectedDay, activeDays, onSelectedDay, setRightTab])

  const selectedWeekday = selectedDay
    ? WEEKDAY_LABELS[new Date(`${selectedDay}T12:00:00`).getDay()]
    : null

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,32.5rem),1fr))] items-start gap-3">
      <section className={perfUi.panel} aria-label="Calendar">
        <header className={perfUi.panelHead}>
          <span className={perfUi.cap}>Calendar</span>
          <span className="flex items-center gap-0.5">
            <button type="button" className={btn} onClick={() => onShiftMonth(-1)} aria-label="Previous month" title="Previous month">
              ‹ Prev
            </button>
            <span className="min-w-29 text-center text-dense-body font-semibold">{monthLabel}</span>
            <button type="button" className={btn} onClick={() => onShiftMonth(1)} aria-label="Next month" title="Next month">
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
          <div className="min-w-0 overflow-x-auto">
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
          </div>

          {isLoading ? (
            <Skeleton className="min-h-40 flex-1 rounded-sm" />
          ) : (
            <div className="grid grid-cols-7 gap-0.75">
              {WEEKDAY_LABELS.map((wd) => (
                <span key={wd} className={cn(perfUi.cap, 'text-center text-dense-micro')}>
                  {wd}
                </span>
              ))}
              {calendarGrid.flatMap((week, wi) =>
                week.days.map((cell, di) => {
                  if (!cell) return <span key={`${wi}-${di}`} aria-hidden />
                  const showN = isStkTab && Math.abs(cell.notional) >= 0.005
                  const showU = !isStkTab && Math.abs(cell.unrealized) >= 0.005
                  const showR = Math.abs(cell.realized) >= 0.005
                  const hasData = showR || showU || showN
                  const isSelected = selectedDay === cell.date
                  const dow = new Date(`${cell.date}T12:00:00`).getDay()
                  const weekend = dow === 0 || dow === 6
                  const titleParts = [fmtIsoDateToken(cell.date)]
                  if (hasData) {
                    titleParts.push(`R ${fmtMoneyFull(cell.realized)}`)
                    titleParts.push(isStkTab ? `${flowMetricLabel} ${fmtMoneyFull(cell.notional)}` : `U ${fmtMoneyFull(cell.unrealized)}`)
                    titleParts.push("click for the day's records")
                  } else {
                    titleParts.push(weekend ? 'not a trading day' : 'no fills that day')
                  }
                  return (
                    <button
                      key={`${wi}-${di}`}
                      type="button"
                      title={titleParts.join(' · ')}
                      onClick={hasData ? () => openDay(isSelected ? null : cell.date) : undefined}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex min-h-13.5 flex-col items-stretch gap-px rounded-[4px] border bg-transparent px-1.25 pt-0.75 pb-1 text-left',
                        hasData ? 'cursor-pointer hover:border-[var(--sk-accent)]' : 'cursor-default',
                        isSelected
                          ? 'border-[var(--sk-accent)] bg-[var(--sk-surface)]'
                          : weekend
                            ? 'border-border/35'
                            : 'border-border',
                      )}
                    >
                      <span className="text-dense-caption text-muted-foreground">{cell.dayNum}</span>
                      {showR && (
                        <CellFigure label="R" value={cell.realized} tone={cn('font-semibold', pnlColorClass(cell.realized))} />
                      )}
                      {showU && <CellFigure label="U" value={cell.unrealized} tone="text-secondary-foreground" />}
                      {showN && <CellFigure label={flowMetricLabel} value={cell.notional} tone="text-secondary-foreground" />}
                    </button>
                  )
                }),
              )}
            </div>
          )}

          <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
            {isStkTab
              ? `R is broker-realized P&L on the day's fills; ${isFiStreamTab ? 'S is money in and out of the bucket' : 'N is signed trade size'}. An empty cell is no fill, not a flat day.`
              : "R is realized on pairs closed that day; U is that day's unmatched premium — a path figure, not open P&L. Two kinds of number, never added. An empty cell is no fill, not a flat day."}{' '}
            {onExplainCell ? (
              <button type="button" className={perfUi.link} onClick={onExplainCell}>
                what a day cell contains →
              </button>
            ) : (
              <InfoTooltip text={CALENDAR_HELP} />
            )}
          </p>
        </div>
      </section>

      <section ref={slotRef} className={cn(perfUi.panel, 'scroll-mt-16')} aria-label="Summary and day records">
        <header className={perfUi.panelHead}>
          <span className="flex gap-1">
            <button type="button" className={tabBtn(!showRecords)} onClick={() => setRightTab('summary')}>
              Summary
            </button>
            <button
              type="button"
              className={tabBtn(showRecords, selectedDay != null)}
              onClick={() => setRightTab(selectedDay ? 'records' : 'summary')}
              title={selectedDay ? `The fills behind ${fmtIsoDateToken(selectedDay)}` : 'Click a day in the calendar, or a day row in the audit table'}
            >
              {selectedDay ? `Records · ${fmtIsoDateToken(selectedDay)}` : 'Records · pick a day'}
            </button>
          </span>
          <span className="min-w-0 flex-[1_1_9rem] text-xs text-muted-foreground">
            {showRecords
              ? `${selectedWeekday} · every fill, its FIFO pair, and the linked stock`
              : `by asset class · ${rangeLabel}`}
          </span>
          {showRecords && (
            <span className="flex gap-1">
              <button type="button" className={btn} onClick={() => stepDay(-1)} title="Previous trading day · k" aria-label="Previous day with a reading">
                ↑
              </button>
              <button type="button" className={btn} onClick={() => stepDay(1)} title="Next trading day · j" aria-label="Next day with a reading">
                ↓
              </button>
              <button type="button" className={btn} onClick={() => openDay(null)} title="Back to Summary · esc" aria-label="Close the day's records">
                ✕
              </button>
            </span>
          )}
        </header>

        {showRecords && bulk ? (
          <div>
            <div className="flex flex-wrap gap-1.5 border-b border-border/55 px-3 py-2.25">
              {dayStats.map((stat) => (
                <span key={stat.label} className="flex min-w-0 flex-col gap-px rounded-sm border border-border px-2 py-1.25" title={stat.title}>
                  <span className={cn(perfUi.cap, 'text-dense-micro')}>{stat.label}</span>
                  <span className={cn(perfUi.mono, 'text-xs font-semibold', statTone(stat))}>{stat.value}</span>
                </span>
              ))}
            </div>
            <CalendarDayDetail
              key={selectedDay}
              selectedDay={selectedDay}
              calendarAssetTab={calendarAssetTab}
              rawExecsWindow={bulk.rawExecsWindow}
              linkByOptionId={bulk.linkByOptionId}
              positionCategoryByAccountContract={positionCategoryByAccountContract}
              rangeStart={rangeStart}
            />
            <p className={cn(perfUi.panelFoot, 'm-0')}>
              Pairing looks back 365 days, so a matched leg can sit outside the selected range — flagged where it does.{' '}
              <Link to="/portfolio/ledger" className={perfUi.link}>
                Trade ledger →
              </Link>
            </p>
          </div>
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
