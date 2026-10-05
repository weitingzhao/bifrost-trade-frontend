/**
 * The Events Book face's arithmetic — which of the book's option legs cross a
 * dated event, grouped by the shared expiry rule (`bucketByExpiry`, §14.2), and
 * where Research's estimated earnings prints fall on the 30-day lanes.
 */
import type { IbPositionRow } from '@/types/monitor'
import { bucketByExpiry, expiryIso } from '@/utils/bookCalendar'
import { EARNINGS_ABSENCE_LABEL, type EarningsAbsence, type EarningsReading } from '@/utils/earningsReading'

export interface ExposureRow {
  sym: string
  expiry: string
  inDays: number
  isOpex: boolean
  legs: string
}

/** Calendar days between two ISO dates. */
export function daysUntil(todayIso: string, dateIso: string): number {
  return Math.round((Date.parse(dateIso) - Date.parse(todayIso)) / 86_400_000)
}

/**
 * One row per name × expiry, nearest expiry first; within a date, names in the
 * order the book lists them.
 */
export function bookExposures(
  accounts: readonly { positions?: readonly IbPositionRow[] | null }[],
  todayIso: string,
  opexDates: readonly string[],
): ExposureRow[] {
  const legs = accounts.flatMap((a) =>
    (a.positions ?? []).filter((p) => (p.secType ?? '').toUpperCase() === 'OPT' && p.symbol && p.position),
  )
  return bucketByExpiry(legs, (p) => expiryIso(p)).flatMap(({ iso, items }) => {
    const bySym = new Map<string, string[]>()
    for (const p of items) {
      const sym = (p.symbol ?? '').toUpperCase()
      const qty = Number(p.position)
      bySym.set(sym, [...(bySym.get(sym) ?? []), `${qty > 0 ? '+' : '−'}${Math.abs(qty)} ${p.strike ?? ''}${p.right ?? ''}`])
    }
    return [...bySym].map(([sym, legLabels]) => ({
      sym,
      expiry: iso,
      inDays: daysUntil(todayIso, iso),
      isOpex: opexDates.includes(iso),
      legs: legLabels.join(' · '),
    }))
  })
}

/** One estimated print on a lane. */
export interface EarningsMark {
  sym: string
  date: string
  /** How the rule has done on this name — the mark's hover says it. */
  title: string
}

export interface EarningsLane {
  /** Marks inside the window, by ISO date. */
  byDate: Map<string, EarningsMark[]>
  /** The nearest estimate past the window, so an empty lane can say when the next one is. */
  nextBeyond: EarningsMark | null
}

export interface EarningsLanes {
  book: EarningsLane
  watch: EarningsLane
  /** Names with an estimate (any date) out of names read. */
  estimated: number
  read: number
  /** Names still being read. */
  pending: number
  /** Names with no estimate, grouped by why. */
  absent: { code: EarningsAbsence['code']; label: string; names: string[] }[]
}

function markTitle(sym: string, r: Extract<EarningsReading, { kind: 'expected' }>): string {
  const { date, track } = r.next
  const record =
    track.n > 0 && track.maxMissDays != null
      ? ` On this name the rule landed within ${track.maxMissDays} day${track.maxMissDays === 1 ? '' : 's'} on its last ${track.n} prints.`
      : ''
  return `${sym} earnings ~${date} (est.) — last year's same-quarter results 8-K plus 52 weeks.${record}`
}

/**
 * The Book and Watchlist earnings lanes: Research's estimate for each name
 * (`expected_next`), placed on the window's days. A late print (estimate
 * passed, no results 8-K yet) is not drawn — it has no day ahead to sit on.
 */
export function earningsLanes(
  names: { book: readonly string[]; watch: readonly string[] },
  readings: Readonly<Record<string, EarningsReading>>,
  windowDays: readonly string[],
): EarningsLanes {
  const inWindow = new Set(windowDays)
  const last = windowDays[windowDays.length - 1] ?? ''
  const lane = (syms: readonly string[]): EarningsLane => {
    const byDate = new Map<string, EarningsMark[]>()
    let nextBeyond: EarningsMark | null = null
    for (const sym of syms) {
      const r = readings[sym]
      if (!r || r.kind !== 'expected' || r.next.daysAway < 0) continue
      const mark = { sym, date: r.next.date, title: markTitle(sym, r) }
      if (inWindow.has(mark.date)) byDate.set(mark.date, [...(byDate.get(mark.date) ?? []), mark])
      else if (mark.date > last && (nextBeyond == null || mark.date < nextBeyond.date)) nextBeyond = mark
    }
    return { byDate, nextBeyond }
  }
  const all = [...names.book, ...names.watch]
  const absent = new Map<EarningsAbsence['code'], string[]>()
  let estimated = 0
  let read = 0
  for (const sym of all) {
    const r = readings[sym]
    if (!r) continue
    read += 1
    if (r.kind === 'expected') estimated += 1
    else absent.set(r.absence.code, [...(absent.get(r.absence.code) ?? []), sym])
  }
  return {
    book: lane(names.book),
    watch: lane(names.watch),
    estimated,
    read,
    pending: all.length - read,
    absent: [...absent].map(([code, syms]) => ({ code, label: EARNINGS_ABSENCE_LABEL[code], names: syms })),
  }
}
