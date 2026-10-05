/**
 * The Events Book face's arithmetic — which of the book's option legs cross a
 * dated event, grouped by the shared expiry rule (`bucketByExpiry`, §14.2).
 */
import type { IbPositionRow } from '@/types/monitor'
import { bucketByExpiry, expiryIso } from '@/utils/bookCalendar'

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
