/**
 * The Calendar's day panel — the selected day beside the grid, never a third
 * float (§17.9 #8): what it holds by layer, each item opening the page that
 * owns it, and every owner page reachable whatever the day (design
 * `Home Calendar.dc.html`, Rev .145–.149).
 */
import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DenseList, DenseListRow, PanelHead, formatDayLabel, isoDaysBetween } from '@bifrost/ui'
import type { CalendarItem } from '@/lib/calendar/calendarLayers'
import type { CalendarHoliday } from '@/lib/calendar/holidaysLayer'
import type { CalendarPnlDay } from '@/lib/calendar/pnlLayer'
import { cn } from '@/lib/utils'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { CALENDAR_LAYERS, LAYER_GROUPS, LAYER_BY_ID, dayGroups, journalDayHref, relativeDayWords } from './calendarModel'
import { CalendarPnlFigure } from './CalendarViews'
import { calendarInkClass, textBesideSymbol } from './calendarUi'

const CAP = 'text-dense-meta font-semibold whitespace-nowrap text-[var(--sk-mute)]'
const LINK = 'text-dense-meta whitespace-nowrap text-[var(--sk-accent)] hover:text-[var(--sk-accent2)]'
const RULE = 'border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]'

export interface CalendarDayPanelProps {
  day: string
  today: string
  items: readonly CalendarItem[]
  pnl: CalendarPnlDay | null
  holiday: CalendarHoliday | null
  /** Items that day on layers that are off. */
  hidden: number
  onShowAll: () => void
  onOpen: (item: CalendarItem, e: MouseEvent) => void
  linkOf: (item: CalendarItem, children: ReactNode) => ReactNode
  /** Open the name beside the page (the Symbol panel), without narrowing the Calendar. */
  onSymbol: (sym: string) => void
  /** Narrow to the name — the top bar carries it to every page that reads it. */
  onOnly: (sym: string) => void
}

export function CalendarDayPanel(p: CalendarDayPanelProps) {
  const groups = dayGroups(p.items)
  const happened = p.day <= p.today
  const rel = relativeDayWords(p.day, p.today, isoDaysBetween)
  const empty = groups.length === 0 && p.pnl == null
  const ownerHref = (id: (typeof CALENDAR_LAYERS)[number]['id']) =>
    id === 'decisions' && happened ? journalDayHref(p.day) : LAYER_BY_ID[id].to

  return (
    <aside
      aria-label={`Day · ${formatDayLabel(p.day)}`}
      className="sticky top-0 flex min-w-0 flex-[1_1_300px] flex-col gap-3 self-start mat-card p-3 max-w-[360px]"
    >
      <PanelHead
        title={formatDayLabel(p.day)}
        meta={<span className={p.day === p.today ? 'text-[var(--sk-accent)]' : undefined}>{rel}</span>}
        className="-mx-3 -mt-3"
      />
      {p.holiday ? <div className="text-dense-label text-[var(--sk-mute)]">{p.holiday.label}</div> : null}

      {p.pnl ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className={CAP} title="Broker-realized P&L on the day — what Performance prints as R, summed over its four tabs">
              Realized P&amp;L
            </span>
            <CalendarPnlFigure value={p.pnl.realized} className="text-lg font-bold" />
            <Link
              to="/portfolio/performance"
              className={cn(LINK, 'ml-auto')}
              title="R / U / N and the fills behind it are on Performance"
            >
              Performance →
            </Link>
          </div>
          {Math.abs(p.pnl.optionsUnrealized) >= 0.005 ? (
            <div className="text-dense-meta text-[var(--sk-mute)]">
              Options U <span className="font-mono text-unrealized">{fmtSignedUsd0(p.pnl.optionsUnrealized)}</span> — the
              day’s unmatched premium, a path figure; never added to R.
            </div>
          ) : null}
        </div>
      ) : null}

      {groups.map((g) => (
        <div key={g.layer.id} className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-baseline gap-2">
            <span className={CAP}>{g.layer.label}</span>
            <span className="font-mono text-dense-meta text-[var(--sk-mute)]">{g.items.length}</span>
            <Link to={ownerHref(g.layer.id)} className={cn(LINK, 'ml-auto')}>
              {g.layer.owner} →
            </Link>
          </div>
          <DenseList aria-label={g.layer.label} className="-mx-1.5">
            {g.items.map((i) => {
              const sym = i.syms[0] ?? ''
              return (
                <DenseListRow
                  key={i.key}
                  onClick={(e) => p.onOpen(i, e as MouseEvent)}
                  title={`Open in ${LAYER_BY_ID[i.layer].owner}`}
                  className="flex min-w-0 items-baseline gap-2 py-[3px] text-dense-label"
                >
                  {sym ? (
                    <button
                      type="button"
                      className="flex-none cursor-pointer border-0 bg-transparent p-0 font-mono text-dense-meta font-bold text-entity-symbol hover:underline"
                      title={`Open ${sym} beside`}
                      onClick={(e) => {
                        e.stopPropagation()
                        p.onSymbol(sym)
                      }}
                    >
                      {sym}
                    </button>
                  ) : null}
                  <span
                    className={cn(
                      'min-w-0 leading-[1.45] text-pretty',
                      g.layer.tense === 'future' ? calendarInkClass(i.ink) : 'text-[var(--sk-soft)]',
                    )}
                  >
                    {p.linkOf(i, textBesideSymbol(i.text, sym))}
                  </span>
                  <span className="ml-auto flex flex-none items-center gap-1.5">
                    {sym ? (
                      <button
                        type="button"
                        className="h-[18px] cursor-pointer rounded-full border-0 bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-[7px] text-dense-caption text-[var(--sk-mute2)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_13%,transparent)] hover:text-foreground"
                        title={`Scope to ${sym} — the top bar carries it to other pages`}
                        aria-label={`Scope to ${sym}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          p.onOnly(sym)
                        }}
                      >
                        Only
                      </button>
                    ) : null}
                    <span aria-hidden className="text-dense-meta text-[var(--sk-accent)]">
                      →
                    </span>
                  </span>
                </DenseListRow>
              )
            })}
          </DenseList>
        </div>
      ))}

      {empty ? (
        <div className="flex flex-col gap-2">
          <div className="text-dense-label leading-normal text-[var(--sk-mute)]">
            {p.hidden > 0
              ? `Nothing on the visible layers. ${p.hidden} item${p.hidden === 1 ? '' : 's'} on hidden layers.`
              : p.holiday?.kind === 'closed'
                ? 'Market closed.'
                : 'Nothing dated on this day.'}
          </div>
          {p.hidden > 0 ? (
            <button type="button" className="self-start mat-btn h-6 px-2.5 text-dense-label" onClick={p.onShowAll}>
              Show all layers
            </button>
          ) : null}
        </div>
      ) : null}

      {happened ? (
        <Link
          to={journalDayHref(p.day)}
          className={cn(LINK, RULE, 'block w-full pt-1 text-left text-dense-label')}
          title="The whole trail of the day: notes, fills, threads, visits, artifacts, decisions"
        >
          Open the day in Journal →
        </Link>
      ) : null}

      <div className={cn(RULE, 'mt-0.5 flex flex-col gap-2 pt-2.5')}>
        <span className={CAP}>Pages behind the layers</span>
        {LAYER_GROUPS.map((g) => {
          const seen = new Set<string>()
          const owners = g.ids.map((id) => LAYER_BY_ID[id]).filter((l) => (seen.has(l.owner) ? false : (seen.add(l.owner), true)))
          return (
            <div key={g.label} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="basis-full text-dense-caption font-semibold text-[var(--sk-mute)]">{g.label}</span>
              {owners.map((l) => (
                <Link
                  key={l.owner}
                  to={l.owner === 'Journal' && happened ? journalDayHref(p.day) : l.to}
                  className={cn(LINK, 'text-dense-label')}
                  title={`Open ${l.owner} · ${CALENDAR_LAYERS.filter((x) => x.owner === l.owner)
                    .map((x) => x.label)
                    .join(' · ')}`}
                >
                  {l.owner} →
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
