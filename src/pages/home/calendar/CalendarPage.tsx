/**
 * Home › Calendar — every dated thing in one grid (design `Home
 * Calendar.dc.html`, Rev .145–.150). Before today a cell shows what happened,
 * from today what is coming, and today both (Owner #19). Each layer is read
 * from the page that owns it, through that page's reader (`lib/calendar`),
 * and nothing is computed here (§14.2); every item opens the object it names
 * on its owner. The calendar holds no verbs (§17.9 #11): only links.
 *
 * The frame is `@bifrost/ui`'s calendar kit (CalendarGrid · CalendarNav), the
 * layer trays its filter kit (FilterGroup), so this page decides only what a
 * day says.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarGrid,
  CalendarNav,
  FilterGroup,
  formatMonthLabel,
  formatWeekLabel,
  isoAddDays,
  isoDow,
  isWeekendIso,
  shiftIsoMonth,
  type CalendarDayContext,
} from '@bifrost/ui'
import { PageHead, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { ResearchUserSwitcher } from '@/components/auth/ResearchUserSwitcher'
import { RESEARCH_AUTH_EXPIRED_LINE, RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'
import { useResearchAuth } from '@/lib/auth/researchUser'
import type { CalendarItem, CalendarLayerId } from '@/lib/calendar/calendarLayers'
import { etTodayIso } from '@/lib/freshness'
import { usePageViewParams } from '@/lib/pageView'
import { clearCarriedSymbol, normalizeSymbol } from '@/lib/symbolContext'
import { tradeHowFrom, useOpenTrade } from '@/layout/tradeGo'
import { useSymbolGo } from '@/layout/symbolGo'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import {
  CALENDAR_LAYERS,
  CALENDAR_PRESETS,
  CELL_CAP,
  LAYER_BY_ID,
  LAYER_GROUPS,
  PRESET_LABEL,
  cellLines,
  chipCountText,
  chipStateWords,
  hasRealized,
  hiddenOnDay,
  itemsByDay,
  layerMonthCount,
  layerParamOf,
  monthDates,
  parseLayerParam,
  pnlOfDay,
  presetOfLayers,
  visibleItems,
  type CalendarPresetId,
} from './calendarModel'
import { CalendarDayPanel } from './CalendarDayPanel'
import { CalendarListView, CalendarPnlFigure, MonthCellBody, WeekCellBody, type CalendarListDay } from './CalendarViews'
import { useCalendarData } from './useCalendarData'
import { useCalendarKeys } from './useCalendarKeys'

const PAGE_INFO =
  'Every dated thing in one grid. Before today a cell shows what happened; from today, what is coming — today shows both. Each layer is read from the page that owns it, and nothing is computed here.'

type CalendarViewId = 'month' | 'week' | 'list'
const VIEW_OPTIONS = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'list', label: 'List' },
]
/** The view a reader keeps on this page between visits (Rev .75 pageView): layers and view, as the prototype attaches. */
const KEPT = ['layers', 'view'] as const
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const ISO_MONTH = /^\d{4}-\d{2}$/
const TRADE_PATH = /^\/trade\/(\d+)$/

function mondayOf(d: string): string {
  return isoAddDays(d, -((isoDow(d) + 6) % 7))
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const openTrade = useOpenTrade()
  const symbolGo = useSymbolGo()
  const { token } = useResearchAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  usePageViewParams(KEPT)
  // Today in New York, read once: the page's own clock does not move under a reader.
  const [today] = useState(() => etTodayIso())

  const patch = useCallback(
    (u: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(u)) {
            if (v == null) next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const layersRaw = params.get('layers')
  const on = useMemo(() => parseLayerParam(layersRaw) ?? new Set(CALENDAR_PRESETS.trading), [layersRaw])
  const preset = presetOfLayers(on)
  const viewRaw = params.get('view')
  const view: CalendarViewId = viewRaw === 'week' || viewRaw === 'list' ? viewRaw : 'month'
  const dayRaw = params.get('day') ?? ''
  const sel = ISO_DAY.test(dayRaw) ? dayRaw : today
  const monthRaw = params.get('month') ?? ''
  const month = ISO_MONTH.test(monthRaw) ? monthRaw : sel.slice(0, 7)
  const sym = normalizeSymbol(params.get('symbol'))
  const weekMon = mondayOf(sel)

  const data = useCalendarData([month, view === 'week' ? weekMon.slice(0, 7) : month])
  const v = useMemo(() => ({ on, sym, today }), [on, sym, today])
  const vis = useMemo(() => visibleItems(data.items, v), [data.items, v])
  const byDay = useMemo(() => itemsByDay(vis), [vis])
  const pnlOf = useCallback((d: string) => pnlOfDay(data.pnl, d, v), [data.pnl, v])

  const setLayers = (next: ReadonlySet<CalendarLayerId>) =>
    patch({ layers: presetOfLayers(next) === 'trading' ? null : layerParamOf(next) })
  const select = useCallback((d: string) => patch({ day: d, month: d.slice(0, 7) }), [patch])
  const shift = (dir: 1 | -1) => {
    if (view === 'week') select(isoAddDays(sel, 7 * dir))
    else patch({ month: shiftIsoMonth(month, dir) })
  }
  const goToday = useCallback(() => select(today), [select, today])
  const panelRef = useRef<HTMLDivElement | null>(null)
  useCalendarKeys({
    sel,
    month,
    today,
    onSelect: select,
    onMonth: (m) => patch({ month: m }),
  })

  /** An item opens the object it names on its owner — a Trade in the Trade surface, any other a page. */
  const openItem = useCallback(
    (item: CalendarItem, e?: MouseEvent) => {
      const trade = TRADE_PATH.exec(item.to)
      if (trade) openTrade(Number(trade[1]), { from: 'Calendar', ...tradeHowFrom(e) })
      else navigate(item.to)
    },
    [navigate, openTrade],
  )
  const linkOf = useCallback(
    (item: CalendarItem, children: ReactNode) => (
      <Link
        to={item.to}
        className="text-inherit hover:underline"
        onClick={(e) => {
          e.stopPropagation()
          if (TRADE_PATH.test(item.to)) {
            e.preventDefault()
            openItem(item, e)
          }
        }}
      >
        {children}
      </Link>
    ),
    [openItem],
  )
  const onlySymbol = (s: string) => symbolGo.go(s)
  const besideSymbol = (s: string) => symbolGo.go(s, 'compare')
  const clearSymbol = () => {
    clearCarriedSymbol()
    patch({ symbol: null })
  }

  const holidays = useMemo(
    () =>
      Object.fromEntries(
        [...data.holidays].map(([d, h]) => [
          d,
          // The grid writes `· market closed` / `· early close` itself; it takes the name.
          { label: h.label.split(' · ')[0], kind: h.kind === 'closed' ? ('closed' as const) : ('early' as const) },
        ]),
      ),
    [data.holidays],
  )
  const hasContent = useCallback((d: string) => byDay.has(d) || hasRealized(pnlOf(d)), [byDay, pnlOf])
  const renderCorner = (ctx: CalendarDayContext) => {
    const p = pnlOf(ctx.date)
    return p && hasRealized(p) ? <CalendarPnlFigure value={p.realized} /> : null
  }
  const cellLabel = (ctx: CalendarDayContext) => {
    const words = cellLines(byDay.get(ctx.date) ?? []).map((l) => l.text)
    const p = pnlOf(ctx.date)
    if (p && hasRealized(p)) words.push(`realized ${fmtSignedUsd0(p.realized)}`)
    return words.join(' · ') || null
  }

  // Chips — each layer's count this month, as the grid would draw it.
  const signedOutWords = token ? RESEARCH_AUTH_EXPIRED_LINE : RESEARCH_AUTH_NOT_SET_LINE
  const chipItems = (ids: readonly CalendarLayerId[]) =>
    ids.map((id) => {
      const L = LAYER_BY_ID[id]
      const r = data.readings[id]
      const n = layerMonthCount(id, data.items, data.pnl, month, { sym, today })
      const state = chipStateWords(r, signedOutWords.split(' — ')[0])
      const why = id === 'events' || id === 'decisions' ? r.note : null
      return {
        id,
        label: L.short ?? L.label,
        count: chipCountText(n, r),
        title: [`From ${L.owner}`, L.tense === 'past' ? 'days up to today' : L.id === 'events' ? 'reported before today, scheduled from today' : 'today on', state, why].filter(Boolean).join(' · '),
      }
    })

  // Layers that are on and cannot be read whole — said once, under the trays.
  const signedOut = CALENDAR_LAYERS.filter((l) => on.has(l.id) && data.readings[l.id].state === 'signed-out')
  const layerNotes = CALENDAR_LAYERS.filter((l) => on.has(l.id)).flatMap((l) => {
    const r = data.readings[l.id]
    if (r.state === 'signed-out' || r.state === 'loading') return []
    if (r.state === 'failed' || r.state === 'unprovided') return [{ id: l.id, text: `${l.label}: ${r.note ?? chipStateWords(r)}` }]
    if (l.id === 'drafts' || l.id === 'notes') return r.note ? [{ id: l.id, text: `${l.label}: ${r.note}` }] : []
    return r.floor ? [{ id: l.id, text: `${l.label}: a capped read — counts are at least, not totals (≥).` }] : []
  })

  // A month is thirty-odd days: read on render.
  const days = monthDates(month)
  const weekendShown = days.some((d) => isWeekendIso(d) && (hasContent(d) || d === today || d === sel))
  const listDays = days.flatMap((d): CalendarListDay[] => {
    const items = byDay.get(d) ?? []
    const p = pnlOf(d)
    const r = hasRealized(p) ? (p?.realized ?? null) : null
    return items.length === 0 && r == null ? [] : [{ d, items, pnl: r }]
  })

  const rangeLabel = view === 'week' ? formatWeekLabel(weekMon, isoAddDays(weekMon, 4)) : formatMonthLabel(month)
  const presetOptions = [
    ...(Object.keys(CALENDAR_PRESETS) as CalendarPresetId[]).map((id) => ({ value: id, label: PRESET_LABEL[id] })),
    ...(preset === 'custom' ? [{ value: 'custom', label: 'Custom' }] : []),
  ]

  // A deep link `?day=` lands its month in view.
  useEffect(() => {
    if (ISO_DAY.test(dayRaw) && !ISO_MONTH.test(monthRaw)) patch({ month: dayRaw.slice(0, 7) })
  }, [dayRaw, monthRaw, patch])

  return (
    <PageShell className="space-y-3">
      <PageHead title="Calendar" info={PAGE_INFO} />

      <div data-sr-toolbar="">
        <span data-sr-tb="label">Preset</span>
        <SegmentControl
          value={preset}
          onChange={(p) => {
            if (p === 'custom') return
            setLayers(new Set(CALENDAR_PRESETS[p as CalendarPresetId]))
          }}
          options={presetOptions}
          size="xs"
          ariaLabel="Preset"
        />
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">View</span>
        <SegmentControl
          value={view}
          onChange={(x) => patch({ view: x === 'month' ? null : x })}
          options={VIEW_OPTIONS}
          size="xs"
          ariaLabel="View"
        />
        <span data-sr-tb="sep" />
        <CalendarNav label={rangeLabel} onPrev={() => shift(-1)} onNext={() => shift(1)} onToday={goToday} />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
        {LAYER_GROUPS.map((g) => (
          <FilterGroup key={g.label} label={g.label} items={chipItems(g.ids)} value={on} onChange={(next) => setLayers(next as Set<CalendarLayerId>)} />
        ))}
      </div>

      {sym ? (
        <div className="flex flex-wrap items-baseline gap-2 text-dense-meta text-[var(--sk-mute)]">
          <span>
            Scoped to <span className="font-mono font-bold text-entity-symbol">{sym}</span> from the top bar. P&amp;L is
            book-level and hides; macro events and OPEX stay, since they reach every name.
          </span>
          <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-dense-meta text-[var(--sk-accent)]" onClick={clearSymbol}>
            Clear
          </button>
        </div>
      ) : null}

      {signedOut.length > 0 || layerNotes.length > 0 ? (
        <div className="flex flex-col gap-1 text-dense-meta leading-normal text-[var(--sk-mute)]" data-testid="calendar-layer-notes">
          {signedOut.length > 0 ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <span>
                {signedOut.map((l) => l.label).join(' · ')} not read — {signedOutWords.split(' — ')[0]}. The layers are
                unread, not empty.
              </span>
              <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-dense-meta text-[var(--sk-accent)]" onClick={() => setAuthOpen(true)}>
                Set user
              </button>
              <ResearchUserSwitcher showTrigger={false} open={authOpen} onOpenChange={setAuthOpen} />
            </div>
          ) : null}
          {layerNotes.map((n) => (
            <span key={n.id}>{n.text}</span>
          ))}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-2">
          {view === 'list' ? (
            <CalendarListView
              days={listDays}
              today={today}
              selected={sel}
              rangeLabel={rangeLabel}
              onPick={select}
              onOpen={openItem}
              linkOf={linkOf}
            />
          ) : (
            <>
              <CalendarGrid
                aria-label={view === 'week' ? `Week · ${rangeLabel}` : `Calendar · ${rangeLabel}`}
                span={view === 'week' ? 'week' : 'month'}
                month={month}
                today={today}
                selected={sel}
                onSelect={select}
                onMonthChange={(m) => patch({ month: m })}
                onOpen={(d) => {
                  select(d)
                  panelRef.current?.querySelector<HTMLElement>('[data-sr-click]')?.focus()
                }}
                hasContent={hasContent}
                holidays={holidays}
                renderCell={(ctx) =>
                  view === 'week' ? (
                    <WeekCellBody items={byDay.get(ctx.date) ?? []} />
                  ) : (
                    <MonthCellBody lines={cellLines(byDay.get(ctx.date) ?? [])} cap={CELL_CAP} />
                  )
                }
                renderCorner={renderCorner}
                cellLabel={cellLabel}
              />
              {view === 'month' ? (
                <div className="text-dense-meta text-[var(--sk-mute)]">
                  {weekendShown
                    ? 'Weekdays, and the weekend days that hold something (or today).'
                    : 'Weekdays only. Nothing on the visible layers is dated on a weekend this month.'}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div ref={panelRef} className="contents">
          <CalendarDayPanel
            day={sel}
            today={today}
            items={byDay.get(sel) ?? []}
            pnl={pnlOf(sel)}
            holiday={data.holidays.get(sel) ?? null}
            hidden={hiddenOnDay(data.items, sel, v)}
            onShowAll={() => setLayers(new Set(CALENDAR_LAYERS.map((l) => l.id)))}
            onOpen={openItem}
            linkOf={linkOf}
            onSymbol={besideSymbol}
            onOnly={onlySymbol}
          />
        </div>
      </div>
    </PageShell>
  )
}
