/**
 * Which date an events/calendar row is "on" (TD-193).
 *
 * A radar row carries two dates: `event_date`, the day the event itself
 * happens (a CPI print, a dividend payment, an 8-K's filing day), and
 * `collected_at`, the day the ingest read it. A Date column means the first.
 * The board's calendar showed the second, so a 14 Oct CPI computed on 6 Oct
 * read as 6 Oct.
 *
 * `collected_at` is only a fallback for a row with no event date, and it
 * says so (`basis: 'collected'`) — measured on DEV 2026-10-07, every row of
 * `/research/events/calendar` (17) and of `/research/event-radar/events`
 * (200) carries an event_date, so the fallback is for rows the stores may
 * still hand back, not for rows seen today.
 */
import { ET_ZONE } from '@/lib/format'
import type { EventRadarRow } from '@/api/researchEngine'

export interface EventDay {
  /** `YYYY-MM-DD`. */
  date: string
  basis: 'event' | 'collected'
}

export function eventDayOf(
  row: Pick<EventRadarRow, 'event_date' | 'collected_at'>,
): EventDay | null {
  const ev = (row.event_date ?? '').trim()
  if (ev) return { date: ev.slice(0, 10), basis: 'event' }
  const col = (row.collected_at ?? '').trim()
  if (col) return { date: col.slice(0, 10), basis: 'collected' }
  return null
}

/**
 * The release time of a macro row (`release_ts`, UTC ISO from
 * macro_event_daily since research 0.199.0) as `HH:MM ET`; null for radar
 * rows, which carry a day and no time.
 */
export function fmtReleaseEt(releaseTs: string | null | undefined): string | null {
  if (!releaseTs) return null
  const d = new Date(releaseTs)
  if (Number.isNaN(d.getTime())) return null
  const hm = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: ET_ZONE,
  })
  return `${hm} ET`
}
