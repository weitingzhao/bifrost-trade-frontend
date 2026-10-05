/**
 * Calendar · Corporate actions (future) — the feed rows Corporate Actions
 * reads for the book and the watchlist, through the page's own per-name read
 * (`useCorporateActionsByName`, the same query keys — the Calendar adds no
 * request once the page has been opened), written as the page writes them
 * (`buildBookEvents`, `kindLabel`, `amountLabel`).
 *
 * Day: the ex-date (the vendor's own `YYYY-MM-DD`). A row without one cannot
 * sit on a day and is left out. Every dated row is returned, past and ahead —
 * the page keeps the tense split. Opens Corporate Actions narrowed to the name.
 */
import { useMemo } from 'react'
import { useBookWatchNames } from '@/hooks/useBookWatchNames'
import { useCorporateActionsByName } from '@/hooks/useCorporateActionsByName'
import { etTodayIso } from '@/lib/freshness'
import { amountLabel, buildBookEvents, kindLabel, type FeedRow } from '@/utils/corporateActionEvents'
import type { CalendarItem, CalendarLayerReading } from './calendarLayers'

const NO_SHARES = new Map<string, number>()

export function corpActionItems(rows: readonly FeedRow[], book: ReadonlySet<string>, todayIso: string): CalendarItem[] {
  const out: CalendarItem[] = []
  for (const e of buildBookEvents({ rows, sharesBySymbol: NO_SHARES, legSymbols: new Set(), today: todayIso })) {
    if (!e.exDate) continue
    const short = e.kind === 'dividend' ? 'ex-div' : e.kind === 'split' ? 'split' : 'action'
    const amount = amountLabel(e)
    out.push({
      key: `corp:${e.key}`,
      d: e.exDate,
      layer: 'corp',
      cell: `${e.symbol} ${short}`,
      // A split's label already carries its ratio; a dividend adds its amount.
      text: `${kindLabel(e)}${e.kind !== 'split' && amount !== '—' ? ` · ${amount}` : ''} · ${book.has(e.symbol) ? 'book' : 'watchlist'}`,
      syms: [e.symbol],
      ink: 'sym',
      to: `/portfolio/corporate-actions?symbol=${encodeURIComponent(e.symbol)}`,
    })
  }
  return out.sort((a, b) => a.d.localeCompare(b.d))
}

export function useCalendarCorporateActions(): CalendarLayerReading {
  const names = useBookWatchNames()
  const feeds = useCorporateActionsByName(names.all)
  const stamp = feeds.map((q) => `${q.dataUpdatedAt}:${q.errorUpdatedAt}`).join(',')
  const unread = names.all.filter((_, i) => feeds[i]?.isError && !feeds[i]?.data)
  const items = useMemo(
    () => corpActionItems(feeds.flatMap((q) => q.data?.rows ?? []), new Set(names.book), etTodayIso()),
    // `feeds` is a new array every render; the stamp moves when any read lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stamp, names.book],
  )
  const loading = names.bookLoading || feeds.some((q) => q.isPending)
  return {
    layer: 'corp',
    items,
    state: names.bookFailed || (names.all.length > 0 && unread.length === names.all.length) ? 'failed' : loading ? 'loading' : 'ready',
    note:
      unread.length > 0
        ? `The feed could not be read for ${unread.join(', ')} — left out, not quiet.`
        : null,
  }
}
