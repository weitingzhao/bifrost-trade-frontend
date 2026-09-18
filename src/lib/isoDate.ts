/**
 * Calendar arithmetic on `YYYY-MM-DD` dates.
 *
 * Four modules had grown their own `daysBetween` — two of them exported, with
 * different answers for a string that is not a date — which is how a corporate
 * action can be "8 days away" on one page and crash on another. One
 * implementation, timezone-free by construction: both ends are parsed as UTC
 * midnight, so no local offset can turn a whole number of days into 0.99 of
 * one.
 */

/** Whole days from `from` to `to`, positive when `to` is later. Null when either is not a date. */
export function daysBetween(from: string | null | undefined, to: string | null | undefined): number | null {
  const a = Date.parse(`${String(from ?? '').slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${String(to ?? '').slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((b - a) / 86_400_000)
}

/** Business days in the inclusive range, weekends excluded. Holidays are not known here. */
export function businessDaysBetween(from: string, to: string): number {
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00Z`)
  const end = Date.parse(`${to.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  let n = 0
  for (let t = start; t <= end; t += 86_400_000) {
    const day = new Date(t).getUTCDay()
    if (day !== 0 && day !== 6) n += 1
  }
  return n
}
