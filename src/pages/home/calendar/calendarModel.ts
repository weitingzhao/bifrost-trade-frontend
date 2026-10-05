/**
 * Home › Calendar — the page's own arithmetic over the layers it quotes
 * (design `Home Calendar.dc.html`, Rev .145–.150). Nothing here reads a store
 * or re-derives a figure: the layer readers in `lib/calendar` bring each
 * owner's rows already dated; this file only decides which of them a day,
 * a cell, a chip or the day panel shows.
 *
 * Two rules the prototype leaves open, settled by the Owner (plan 2026-10-04):
 * - #19 today shows both tenses — the day's fills, decisions and P&L as well
 *   as what is coming — so an intraday fill is on the calendar the same day;
 * - #18 decisions sit on the day the Journal files them (New York).
 */
import { isoAddDays } from '@bifrost/ui'
import type { CalendarItem, CalendarLayerId, CalendarLayerReading } from '@/lib/calendar/calendarLayers'
import type { CalendarPnlDay } from '@/lib/calendar/pnlLayer'

export type LayerTense = 'past' | 'future'

export interface CalendarLayerMeta {
  id: CalendarLayerId
  label: string
  /** The chip's label where the full one is long (`Corp actions`). */
  short?: string
  tense: LayerTense
  /** The page the layer is read from. */
  owner: string
  /** Where the owner's page opens from the day panel. */
  to: string
  /** A past layer's count words in a cell (`1 fill` · `4 fills`). */
  one?: string
  many?: string
}

// The prototype's LAYERS, in its order (Rev .148).
export const CALENDAR_LAYERS: readonly CalendarLayerMeta[] = [
  { id: 'pnl', label: 'P&L', tense: 'past', owner: 'Performance', to: '/portfolio/performance' },
  { id: 'fills', label: 'Fills', tense: 'past', owner: 'Orders & Fills', to: '/trade/fills', one: 'fill', many: 'fills' },
  { id: 'decisions', label: 'Decisions', tense: 'past', owner: 'Journal', to: '/research/journal', one: 'decision', many: 'decisions' },
  { id: 'notes', label: 'Notes', tense: 'past', owner: 'Journal', to: '/research/journal?view=notes', one: 'note', many: 'notes' },
  { id: 'events', label: 'Events', tense: 'future', owner: 'Events', to: '/research/events' },
  { id: 'expiry', label: 'Expiries', tense: 'future', owner: 'Expiry', to: '/trade/expiration' },
  { id: 'corp', label: 'Corporate actions', short: 'Corp actions', tense: 'future', owner: 'Corporate Actions', to: '/portfolio/corporate-actions' },
  { id: 'horizons', label: 'Hypothesis horizons', short: 'Horizons', tense: 'future', owner: 'Hypotheses', to: '/research/loop/hypotheses' },
  { id: 'drafts', label: 'Draft expiry', tense: 'future', owner: 'Decision Inbox', to: '/research/loop/decisions' },
]

export const LAYER_BY_ID = Object.fromEntries(CALENDAR_LAYERS.map((l) => [l.id, l])) as Record<CalendarLayerId, CalendarLayerMeta>

/** The two business groups of the layer trays (Rev .148): tense is a property, not the grouping. */
export const LAYER_GROUPS: readonly { label: string; ids: readonly CalendarLayerId[] }[] = [
  { label: 'Book & market', ids: ['pnl', 'fills', 'expiry', 'corp', 'events'] },
  { label: 'Research loop', ids: ['decisions', 'notes', 'horizons', 'drafts'] },
]

export type CalendarPresetId = 'trading' | 'research' | 'review'

export const CALENDAR_PRESETS: Record<CalendarPresetId, readonly CalendarLayerId[]> = {
  trading: ['pnl', 'fills', 'events', 'expiry', 'corp'],
  research: ['decisions', 'horizons', 'drafts', 'events'],
  review: ['pnl', 'fills', 'decisions', 'notes'],
}

export const PRESET_LABEL: Record<CalendarPresetId, string> = { trading: 'Trading', research: 'Research', review: 'Review' }

/** The preset a set of layers is, or `custom` when it is none of them (the segment then shows Custom). */
export function presetOfLayers(on: ReadonlySet<CalendarLayerId>): CalendarPresetId | 'custom' {
  for (const id of Object.keys(CALENDAR_PRESETS) as CalendarPresetId[]) {
    const ids = CALENDAR_PRESETS[id]
    if (ids.length === on.size && ids.every((x) => on.has(x))) return id
  }
  return 'custom'
}

/** Parse the URL's `layers=` (comma list) — unknown ids dropped; null when absent. */
export function parseLayerParam(raw: string | null): Set<CalendarLayerId> | null {
  if (raw == null) return null
  const known = new Set(CALENDAR_LAYERS.map((l) => l.id))
  return new Set(raw.split(',').filter((x): x is CalendarLayerId => known.has(x as CalendarLayerId)))
}

/** The layers in the prototype's order, for the URL. */
export function layerParamOf(on: ReadonlySet<CalendarLayerId>): string {
  return CALENDAR_LAYERS.filter((l) => on.has(l.id)).map((l) => l.id).join(',')
}

/**
 * Whether an item is in its tense on this day. Before today only what
 * happened; after today only what is coming; today both (Owner #19).
 */
export function inTense(item: Pick<CalendarItem, 'd' | 'layer'>, today: string): boolean {
  return LAYER_BY_ID[item.layer].tense === 'past' ? item.d <= today : item.d >= today
}

/**
 * The carried symbol's filter (Rev .149): an item about the name stays; a
 * macro event or OPEX — tied to no name — stays, since it reaches every name.
 */
export function matchesSymbol(item: Pick<CalendarItem, 'syms' | 'layer'>, sym: string): boolean {
  if (!sym) return true
  return item.syms.includes(sym) || (item.layer === 'events' && item.syms.length === 0)
}

export interface CalendarView {
  on: ReadonlySet<CalendarLayerId>
  sym: string
  today: string
}

/** Every item the grid may draw: on a visible layer, in its tense, about the carried name. */
export function visibleItems(all: readonly CalendarItem[], v: CalendarView): CalendarItem[] {
  return all.filter((i) => v.on.has(i.layer) && inTense(i, v.today) && matchesSymbol(i, v.sym))
}

/**
 * Whether a day has a realized figure to print. Performance keeps a day for
 * options U alone (the day's unmatched premium); the corner, the List and the
 * chip print R, so a U-only day is no P&L there — the day panel shows its U.
 */
export function hasRealized(p: Pick<CalendarPnlDay, 'realized'> | null | undefined): boolean {
  return p != null && Math.abs(p.realized) >= 0.5
}

/** The P&L a day shows: on, not narrowed to a name (book-level), happened (today included). */
export function pnlOfDay(
  pnl: ReadonlyMap<string, CalendarPnlDay>,
  d: string,
  v: CalendarView,
): CalendarPnlDay | null {
  if (!v.on.has('pnl') || v.sym || d > v.today) return null
  return pnl.get(d) ?? null
}

export interface CellLine {
  key: string
  text: string
  ink: CalendarItem['ink']
}

/** A cell's lines: one count per past layer (`4 fills`), then each coming item by its short label. */
export function cellLines(dayItems: readonly CalendarItem[]): CellLine[] {
  const lines: CellLine[] = []
  for (const id of ['fills', 'decisions', 'notes'] as const) {
    const n = dayItems.filter((i) => i.layer === id).length
    if (n) {
      const L = LAYER_BY_ID[id]
      lines.push({ key: `count:${id}`, text: `${n} ${n === 1 ? L.one : L.many}`, ink: 'soft' })
    }
  }
  for (const i of dayItems) {
    if (LAYER_BY_ID[i.layer].tense === 'future') lines.push({ key: i.key, text: i.cell || i.text, ink: i.ink })
  }
  return lines
}

/** Lines up to the cap, and how many more (`+N more`). */
export function capLines(lines: readonly CellLine[], cap: number): { shown: CellLine[]; more: number } {
  const c = Math.max(2, Math.min(6, Math.round(cap)))
  return { shown: lines.slice(0, c), more: Math.max(0, lines.length - c) }
}

export const CELL_CAP = 3

/** Every date of a month (`YYYY-MM`), first to last. */
export function monthDates(month: string): string[] {
  const out: string[] = []
  for (let d = `${month}-01`; d.startsWith(month); d = isoAddDays(d, 1)) out.push(d)
  return out
}

/** Items grouped by day. */
export function itemsByDay(items: readonly CalendarItem[]): Map<string, CalendarItem[]> {
  const m = new Map<string, CalendarItem[]>()
  for (const i of items) m.set(i.d, [...(m.get(i.d) ?? []), i])
  return m
}

/**
 * A chip's count: this month's items on that layer, narrowed and in tense as
 * the grid draws them — on or off (the count is what turning it on would add).
 */
export function layerMonthCount(
  id: CalendarLayerId,
  all: readonly CalendarItem[],
  pnl: ReadonlyMap<string, CalendarPnlDay>,
  month: string,
  v: Omit<CalendarView, 'on'>,
): number {
  if (id === 'pnl') {
    if (v.sym) return 0
    return [...pnl.values()].filter((p) => p.d.startsWith(month) && p.d <= v.today && hasRealized(p)).length
  }
  return all.filter((i) => i.layer === id && i.d.startsWith(month) && inTense(i, v.today) && matchesSymbol(i, v.sym)).length
}

export interface DayGroup {
  layer: CalendarLayerMeta
  items: CalendarItem[]
}

/** The day panel's groups, in layer order; P&L is the panel's own line, not a group. */
export function dayGroups(dayItems: readonly CalendarItem[]): DayGroup[] {
  return CALENDAR_LAYERS.filter((l) => l.id !== 'pnl')
    .map((layer) => ({ layer, items: dayItems.filter((i) => i.layer === layer.id) }))
    .filter((g) => g.items.length > 0)
}

/** Items that day on layers that are off — what `Show all layers` would bring back. */
export function hiddenOnDay(all: readonly CalendarItem[], d: string, v: CalendarView): number {
  return all.filter((i) => i.d === d && !v.on.has(i.layer) && inTense(i, v.today) && matchesSymbol(i, v.sym)).length
}

/** `today · coming`, `in 3 days · coming`, `4 days ago · happened` (the panel's head). */
export function relativeDayWords(d: string, today: string, daysBetween: (a: string, b: string) => number): string {
  const n = daysBetween(today, d)
  if (n === 0) return 'today · happened and coming'
  return n > 0 ? `in ${n} day${n === 1 ? '' : 's'} · coming` : `${-n} day${n === -1 ? '' : 's'} ago · happened`
}

/** What a layer's chip prints for its count: a number, `≥ N` on a capped read, `—` when unread. */
export function chipCountText(n: number, reading: Pick<CalendarLayerReading, 'state' | 'floor'> | undefined): string {
  if (!reading) return String(n)
  if (reading.state === 'loading') return '…'
  if (reading.state === 'signed-out' || reading.state === 'failed' || reading.state === 'unprovided') return '—'
  return reading.floor ? `≥ ${n}` : String(n)
}

/** Why a chip's count is not a count — its hover line. */
export function chipStateWords(
  reading: Pick<CalendarLayerReading, 'state' | 'floor'> | undefined,
  /** ResearchAuthGap's words for the 401: user not set, or a token refused. */
  signedOut = 'Research user not set',
): string | null {
  switch (reading?.state) {
    case 'loading':
      return 'reading…'
    case 'signed-out':
      return `not read — ${signedOut}`
    case 'failed':
      return 'the read failed — not an empty layer'
    case 'unprovided':
      return 'not provided yet'
    default:
      return reading?.floor ? 'a capped read — at least this many' : null
  }
}

/** The Journal on that day — its own Day view (`?view=day&day=`, New York day like this page's). */
export function journalDayHref(d: string): string {
  return `/research/journal?view=day&day=${d}`
}
