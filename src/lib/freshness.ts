/**
 * Freshness by the kind of data (DESIGN_CONTRACTS §16.13): "can I trust it
 * now", judged against the trading clock.
 *
 * Quiet when fine and conspicuous when not: fresh is neutral grey (a site of
 * green lamps says nothing), stale is amber, unknown is grey `—`, and red is
 * never a freshness colour. The text is the age; the exact instant and its
 * source go in the title.
 *
 * | kind       | text                              | stale when                       |
 * |------------|-----------------------------------|----------------------------------|
 * | `stream`   | `LIVE · 0s` / `STALE 12s`         | > 5s in regular hours            |
 * | `snapshot` | `FETCHED 2m ago` / `STALE 18m`    | > 5m in regular hours            |
 * | `run`      | `RUN 07:05` / `DUE 07:05` / `LATE`| 15 min past its schedule         |
 *
 * Outside regular hours nothing is stale: a stream reads `CLOSED · 16:00`, a
 * snapshot older than an hour `CLOSED · 16:04`. `session` data keeps its
 * `AsofTag` and is not judged here.
 *
 * The design models regular hours as Mon–Fri 09:30–16:00 ET and leaves the
 * holidays to the app; the calendar here is the market service's
 * (`/market/holidays`, NYSE), full closures and early closes both.
 */

const ET = 'America/New_York'

export type FreshKind = 'stream' | 'snapshot' | 'run'

/** NYSE's exceptions to the weekday: `closed`, or an early close (ms). */
export type TradingCalendar = ReadonlyMap<string, { closed: true } | { closeAt: number }>

export interface FreshReading {
  label: string
  warn: boolean
  title: string
}

interface EtParts {
  date: string
  weekday: number
  minutes: number
}

function etParts(ms: number): EtParts {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ET,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  )
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(String(p.weekday))
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    weekday,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  }
}

/** `HH:MM` (or `HH:MM:SS`) in New York. */
export function etClock(ms: number, seconds = false): string {
  return new Date(ms).toLocaleTimeString('en-US', {
    timeZone: ET,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
  })
}

const OPEN_MIN = 9 * 60 + 30
const CLOSE_MIN = 16 * 60

/** Whether `ms` falls inside NYSE regular hours. */
export function inRTH(ms: number, calendar?: TradingCalendar): boolean {
  const t = etParts(ms)
  if (t.weekday < 1 || t.weekday > 5) return false
  const exception = calendar?.get(t.date)
  if (exception != null && 'closed' in exception) return false
  if (t.minutes < OPEN_MIN) return false
  if (exception != null && 'closeAt' in exception) return ms < exception.closeAt
  return t.minutes < CLOSE_MIN
}

/** `2m`, `18m`, `3h`, `2d` — the age a stamp prints. */
export function fmtAge(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`
}

const STREAM_STALE_MS = 5_000
const SNAPSHOT_STALE_MS = 5 * 60_000
const SNAPSHOT_CLOSED_MS = 60 * 60_000
const RUN_GRACE_MS = 15 * 60_000

/** A snapshot is stale only when regular hours are running and it is over five minutes old. */
export function snapshotStale(atMs: number | null, nowMs: number, calendar?: TradingCalendar): boolean {
  return atMs != null && inRTH(nowMs, calendar) && nowMs - atMs > SNAPSHOT_STALE_MS
}

/** Today's `HH:MM` in New York as an instant, for a run's schedule. */
function etToday(due: string, nowMs: number): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(due)
  if (!m) return null
  const now = etParts(nowMs)
  return nowMs + (Number(m[1]) * 60 + Number(m[2]) - now.minutes) * 60_000
}

export function freshReading(
  kind: FreshKind,
  atMs: number | null,
  nowMs: number,
  opts: { src?: string; due?: string; calendar?: TradingCalendar } = {},
): FreshReading {
  const { src = '', due = '', calendar } = opts
  const stamp = atMs == null ? '—' : `${etClock(atMs, true)} ET`
  const tail = (rule: string) => ` · ${src ? `${src} · ` : ''}${rule}`
  const age = atMs == null ? null : Math.max(0, nowMs - atMs)
  const rth = inRTH(nowMs, calendar)

  if (kind === 'stream') {
    if (!rth) {
      return {
        label: `CLOSED · ${atMs == null ? '—' : etClock(atMs)}`,
        warn: false,
        title: `Market closed — last tick ${stamp}${tail('a stream is only judged in regular hours')}`,
      }
    }
    if (age == null) return { label: 'LIVE · —', warn: false, title: `No tick yet${tail('stale after 5s in regular hours')}` }
    const stale = age > STREAM_STALE_MS
    return {
      label: stale ? `STALE ${fmtAge(age)}` : `LIVE · ${fmtAge(age)}`,
      warn: stale,
      title: `Last tick ${stamp}${tail('stale after 5s in regular hours')}`,
    }
  }

  if (kind === 'snapshot') {
    const rule = 'a fetch instant, not a session · stale after 5m in regular hours; never stale outside them'
    if (age == null || atMs == null) return { label: 'FETCHED —', warn: false, title: `Never fetched${tail(rule)}` }
    const stale = rth && age > SNAPSHOT_STALE_MS
    const label = stale
      ? `STALE ${fmtAge(age)}`
      : !rth && age >= SNAPSHOT_CLOSED_MS
        ? `CLOSED · ${etClock(atMs)}`
        : `FETCHED ${fmtAge(age)} ago`
    return { label, warn: stale, title: `Fetched ${stamp}${tail(rule)}` }
  }

  // run
  const dueAt = due ? etToday(due, nowMs) : null
  if (atMs != null && etParts(atMs).date === etParts(nowMs).date) {
    return {
      label: `RUN ${etClock(atMs)}`,
      warn: false,
      title: `Ran ${stamp}${due ? ` · scheduled ${due} ET` : ''}${tail('a run instant, not a session')}`,
    }
  }
  const late = dueAt != null && nowMs > dueAt + RUN_GRACE_MS
  return {
    label: late ? `LATE · due ${due}` : `DUE ${due || '—'}`,
    warn: late,
    title:
      (late ? `No run today — scheduled ${due} ET, 15 min grace passed` : `Next run ${due || '—'} ET`) +
      (atMs != null ? ` · last ran ${stamp}` : '') +
      tail('late after 15 min'),
  }
}

/** The market service's NYSE rows, as the calendar `inRTH` reads. */
export function tradingCalendar(
  rows: readonly { holiday_date: string; status?: string | null; close_time?: string | null }[],
): TradingCalendar {
  const out = new Map<string, { closed: true } | { closeAt: number }>()
  for (const r of rows) {
    if (r.status === 'closed') out.set(r.holiday_date, { closed: true })
    else if (r.status === 'early-close' && r.close_time) out.set(r.holiday_date, { closeAt: Date.parse(r.close_time) })
  }
  return out
}
