/**
 * What the Calendar draws inside the frame `CalendarGrid` gives it: a month
 * cell's lines, a week column's groups, and the List view (design
 * `Home Calendar.dc.html`, Rev .145–.150).
 */
import type { MouseEvent, ReactNode } from 'react'
import { DenseList, DenseListRow, formatDayLabel, formatRelativeDays } from '@bifrost/ui'
import { InlinePnl } from '@/components/data-display'
import type { CalendarItem } from '@/lib/calendar/calendarLayers'
import { cn } from '@/lib/utils'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { LAYER_BY_ID, capLines, dayGroups, type CellLine } from './calendarModel'
import { calendarInkClass, itemLine } from './calendarUi'

/** The day's realized P&L as the corner and the List print it: `+$1,180`, profit or loss ink. */
export function CalendarPnlFigure({ value, className }: { value: number; className?: string }) {
  return (
    <InlinePnl value={value} className={cn('font-mono tabular-nums', className)}>
      {fmtSignedUsd0(value)}
    </InlinePnl>
  )
}

const LINE = 'block min-w-0 truncate text-dense-meta leading-4'

/** A month cell's body: the lines up to the cap, then `+N more`. */
export function MonthCellBody({ lines, cap }: { lines: readonly CellLine[]; cap: number }) {
  const { shown, more } = capLines(lines, cap)
  return (
    <>
      {shown.map((l) => (
        <span key={l.key} className={cn(LINE, calendarInkClass(l.ink))}>
          {l.text}
        </span>
      ))}
      {more > 0 ? <span className={cn(LINE, 'text-[var(--sk-mute)]')}>+{more} more</span> : null}
    </>
  )
}

/** A week column's body: every item, grouped by layer, in full. */
export function WeekCellBody({ items }: { items: readonly CalendarItem[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 pt-1">
      {dayGroups(items).map((g) => (
        <div key={g.layer.id} className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-dense-caption font-semibold whitespace-nowrap text-[var(--sk-mute)]">{g.layer.label}</span>
          {g.items.map((i) => (
            <span
              key={i.key}
              className={cn(
                'text-dense-meta leading-[1.4] text-pretty',
                calendarInkClass(i.ink),
              )}
            >
              {itemLine(i)}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export interface CalendarListDay {
  d: string
  items: CalendarItem[]
  pnl: number | null
}

/** The List view: every day of the month with something on it, each item opening its owner. */
export function CalendarListView({
  days,
  today,
  selected,
  rangeLabel,
  onPick,
  onOpen,
  linkOf,
}: {
  days: readonly CalendarListDay[]
  today: string
  selected: string
  rangeLabel: string
  onPick: (d: string) => void
  onOpen: (item: CalendarItem, e: MouseEvent) => void
  linkOf: (item: CalendarItem, children: ReactNode) => ReactNode
}) {
  if (days.length === 0) {
    return (
      <section className="mat-card px-3 py-4 text-dense-meta text-[var(--sk-mute)]">
        Nothing dated in {rangeLabel} on the visible layers.
      </section>
    )
  }
  return (
    <section className="mat-card overflow-hidden py-1">
      <DenseList aria-label={`Dated items · ${rangeLabel}`}>
        {days.map((day) => (
          <DenseListRow
            key={day.d}
            selected={day.d === selected}
            onClick={() => onPick(day.d)}
            className="grid grid-cols-[112px_minmax(0,1fr)_auto] gap-3 py-2"
          >
            <div className="flex flex-col gap-px">
              <span
                className={cn(
                  'text-dense-label font-semibold',
                  day.d === today ? 'text-[var(--sk-accent)]' : day.d < today ? 'text-[var(--sk-mute2)]' : 'text-foreground',
                )}
              >
                {formatDayLabel(day.d)}
              </span>
              <span className="text-dense-caption text-[var(--sk-mute)]">{formatRelativeDays(day.d, today)}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-[3px]">
              {day.items.map((i) => (
                <div
                  key={i.key}
                  className="grid min-w-0 cursor-pointer grid-cols-[116px_minmax(0,1fr)] gap-2 rounded-lg px-1.5 py-[3px] text-dense-label hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)]"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(i, e)
                  }}
                  title={`Open in ${LAYER_BY_ID[i.layer].owner}`}
                >
                  <span className="text-dense-meta font-medium whitespace-nowrap text-[var(--sk-mute)]">
                    {LAYER_BY_ID[i.layer].label}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 text-pretty',
                      calendarInkClass(i.ink),
                    )}
                  >
                    {linkOf(i, itemLine(i))}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-dense-label font-semibold">
              {day.pnl != null ? <CalendarPnlFigure value={day.pnl} /> : null}
            </span>
          </DenseListRow>
        ))}
      </DenseList>
    </section>
  )
}
