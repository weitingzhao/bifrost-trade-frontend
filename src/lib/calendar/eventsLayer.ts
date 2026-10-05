/**
 * Calendar · Events (future) — what the Events page puts on its lanes, read
 * the same ways:
 *
 * - Macro: the event radar's dated rows with no affected symbol
 *   (`/research/events/calendar`, the Events page's key). Symbol-tied radar
 *   rows are dividend dates — the Corporate actions layer's, not this one's.
 * - Earnings, `est.`: Research's estimate of each book and watchlist name's
 *   next print (`expected_next`: last year's same-quarter results 8-K plus 52
 *   weeks), the Events lanes' own read (`useNamesEarnings`). The vendor's
 *   confirmed calendar (Benzinga) is not on the plan — 403 not entitled. A
 *   late print (estimate passed, no 8-K yet) has no day ahead and is left off.
 * - OPEX: third Fridays, arithmetic (`bookCalendar.thirdFriday`).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchEventCalendar, type EventRadarRow } from '@/api/researchEngine'
import { useBookWatchNames } from '@/hooks/useBookWatchNames'
import { useNamesEarnings } from '@/hooks/useNamesEarnings'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { thirdFriday } from '@/utils/bookCalendar'
import { EARNINGS_ABSENCE_LABEL, type EarningsReading } from '@/utils/earningsReading'
import { layerStateOf, type CalendarItem, type CalendarLayerReading } from './calendarLayers'

/** Macro rows: dated, tied to no name. The cell is the event's first word after its date (`CPI`, `FOMC`). */
export function macroItems(rows: readonly EventRadarRow[]): CalendarItem[] {
  const out: CalendarItem[] = []
  for (const r of rows) {
    const d = (r.event_date ?? '').slice(0, 10)
    if (!d || (r.affected_symbols ?? '').trim()) continue
    const words = (r.event_summary || r.subject || '').replace(/^\d{4}-\d{2}-\d{2}\s*/, '').trim()
    out.push({
      key: `events:macro:${r.event_id}`,
      d,
      layer: 'events',
      cell: words.split(/\s+/)[0] ?? 'macro',
      text: words,
      syms: [],
      ink: 'macro',
      to: '/research/events',
    })
  }
  return out
}

/** Earnings estimates for the book and the watchlist; a name on both is the book's. */
export function earningsItems(
  names: { book: readonly string[]; watch: readonly string[] },
  readings: Readonly<Record<string, EarningsReading>>,
): CalendarItem[] {
  const out: CalendarItem[] = []
  const place = (sym: string, where: 'book' | 'watchlist') => {
    const r = readings[sym]
    if (!r || r.kind !== 'expected' || r.next.daysAway < 0) return
    out.push({
      key: `events:earnings:${sym}`,
      d: r.next.date,
      layer: 'events',
      cell: `${sym} earnings (est.)`,
      text: `earnings ~${r.next.date} · estimated · ${where} — last year’s same-quarter results 8-K plus 52 weeks`,
      syms: [sym],
      ink: 'sym',
      to: withSymbolParam(SYMBOL_PATH, sym),
      est: true,
    })
  }
  for (const s of names.book) place(s, 'book')
  for (const s of names.watch) place(s, 'watchlist')
  return out
}

/** Monthly OPEX, every third Friday from January of `fromYear` for `years` years. */
export function opexItems(fromYear: number, years = 2): CalendarItem[] {
  return Array.from({ length: years * 12 }, (_, i) => {
    const d = thirdFriday(fromYear + Math.floor(i / 12), i % 12)
    return { key: `events:opex:${d}`, d, layer: 'events' as const, cell: 'OPEX', text: 'Monthly OPEX', syms: [], ink: 'contract' as const, to: '/research/events' }
  })
}

export function useCalendarEvents(): CalendarLayerReading {
  // The Events page's own key, so the two share one read.
  const calendar = useQuery({
    queryKey: ['research-engine', 'events', 'calendar'],
    queryFn: fetchEventCalendar,
    staleTime: 5 * 60_000,
  })
  const names = useBookWatchNames()
  const readings = useNamesEarnings(names.all)
  const year = new Date().getFullYear()
  const macro = useMemo(() => macroItems(calendar.data?.rows ?? []), [calendar.data?.rows])
  const opex = useMemo(() => opexItems(year), [year])
  // `readings` is rebuilt every render (see useNamesEarnings), so this is too — a few dozen names.
  const earnings = earningsItems(names, readings)
  const items = [...macro, ...earnings, ...opex].sort((a, b) => a.d.localeCompare(b.d))
  const pending = names.all.filter((s) => readings[s] == null).length
  const absent = Object.entries(readings).filter(([, r]) => r.kind === 'none')
  const state = layerStateOf([calendar])
  return {
    layer: 'events',
    items,
    state: state === 'ready' && (names.bookLoading || pending > 0) ? 'loading' : state,
    note: [
      state === 'failed' ? 'The macro calendar read failed — OPEX and earnings estimates still stand.' : null,
      `Earnings are Research’s estimates (est.) — the vendor’s confirmed calendar (Benzinga) is not on the plan, 403 not entitled.`,
      absent.length > 0
        ? `No estimate for ${absent.length} of ${names.all.length} names: ${absent
            .map(([sym, r]) => `${sym} (${r.kind === 'none' ? EARNINGS_ABSENCE_LABEL[r.absence.code] : ''})`)
            .join(', ')}.`
        : null,
    ]
      .filter(Boolean)
      .join(' '),
  }
}
