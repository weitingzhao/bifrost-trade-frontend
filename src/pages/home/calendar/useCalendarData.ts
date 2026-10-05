/**
 * Every layer the Calendar quotes, through the owners' own readers
 * (`lib/calendar`) — the Calendar adds no request a page it quotes would not
 * make, and computes no figure of its own (§14.2).
 *
 * All nine are read whether or not they are on: a chip's count is what
 * turning it on would add, so an off layer still has to be known.
 */
import { useMemo } from 'react'
import type { CalendarItem, CalendarLayerId, CalendarLayerReading } from '@/lib/calendar/calendarLayers'
import { useCalendarCorporateActions } from '@/lib/calendar/corpActionsLayer'
import { useCalendarDecisions } from '@/lib/calendar/decisionsLayer'
import { useCalendarDraftExpiry } from '@/lib/calendar/draftExpiryLayer'
import { useCalendarEvents } from '@/lib/calendar/eventsLayer'
import { useCalendarExpiries } from '@/lib/calendar/expiriesLayer'
import { useCalendarFills } from '@/lib/calendar/fillsLayer'
import { useCalendarHolidays, type CalendarHoliday } from '@/lib/calendar/holidaysLayer'
import { useCalendarHorizons } from '@/lib/calendar/horizonsLayer'
import { useCalendarNotes } from '@/lib/calendar/notesLayer'
import { useCalendarPnl, type CalendarPnlDay } from '@/lib/calendar/pnlLayer'

export interface CalendarData {
  /** Every dated item on every layer, in tense or not. */
  items: CalendarItem[]
  /** Each layer's reading — its state, note and whether a count is a floor. */
  readings: Record<CalendarLayerId, Pick<CalendarLayerReading, 'state' | 'note' | 'floor'>>
  /** Performance's day cells, for the months in view. */
  pnl: Map<string, CalendarPnlDay>
  holidays: Map<string, CalendarHoliday>
  holidaysState: 'loading' | 'ready' | 'failed'
}

/**
 * `months` are the `YYYY-MM`s in view — the month shown, and in the week view
 * the month the week starts in when it starts in the previous one. P&L is
 * month-scoped, as Performance's grid is; a repeated month is one read.
 */
export function useCalendarData(months: readonly [string, string]): CalendarData {
  const pnlA = useCalendarPnl(months[0])
  const pnlB = useCalendarPnl(months[1])
  const fills = useCalendarFills()
  const decisions = useCalendarDecisions()
  const notes = useCalendarNotes()
  const events = useCalendarEvents()
  const expiry = useCalendarExpiries()
  const corp = useCalendarCorporateActions()
  const horizons = useCalendarHorizons()
  const drafts = useCalendarDraftExpiry()
  const hol = useCalendarHolidays()

  const layers = [fills, decisions, notes, events, expiry, corp, horizons, drafts]
  // The readers hand back fresh arrays each render where an owner's own read
  // does (Events' earnings); the join keys on their content.
  const sig = layers.map((l) => `${l.layer}:${l.items.map((i) => `${i.key}@${i.d}`).join(',')}`).join('|')
  const items = useMemo(
    () => layers.flatMap((l) => l.items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig],
  )

  const pnl = useMemo(() => {
    const m = new Map<string, CalendarPnlDay>()
    for (const d of [...pnlA.items, ...pnlB.items]) m.set(d.d, d)
    return m
  }, [pnlA.items, pnlB.items])

  const holidays = useMemo(() => new Map(hol.days.map((h) => [h.d, h])), [hol.days])

  const pick = (r: Pick<CalendarLayerReading, 'state' | 'note' | 'floor'>) => ({ state: r.state, note: r.note, floor: r.floor })
  const pnlState: CalendarLayerReading['state'] =
    pnlA.state === 'failed' || pnlB.state === 'failed' ? 'failed' : pnlA.state === 'loading' || pnlB.state === 'loading' ? 'loading' : 'ready'
  const readings = {
    pnl: { state: pnlState, note: pnlA.note ?? pnlB.note, floor: false },
    fills: pick(fills),
    decisions: pick(decisions),
    notes: pick(notes),
    events: pick(events),
    expiry: pick(expiry),
    corp: pick(corp),
    horizons: pick(horizons),
    drafts: pick(drafts),
  } satisfies CalendarData['readings']

  return { items, readings, pnl, holidays, holidaysState: hol.state }
}
