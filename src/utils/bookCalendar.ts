/**
 * The book's calendar arithmetic — OPEX dates and a leg's expiry — shared by
 * the Events Book face and the Daily Brief's Today & next (§14.2: moved here
 * when the brief became the second reader).
 *
 * OPEX is arithmetic, so it is always real: the third Friday of a month.
 */
import type { IbPositionRow } from '@/types/monitor'

/** Third Friday of a month, as an ISO date. */
export function thirdFriday(year: number, month0: number): string {
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay()
  const day = 1 + ((5 - first + 7) % 7) + 14
  return new Date(Date.UTC(year, month0, day)).toISOString().slice(0, 10)
}

/** The monthly OPEX dates of this month and the next `months - 1`. */
export function opexDatesAround(todayIso: string, months = 3): string[] {
  const y = Number(todayIso.slice(0, 4))
  const m = Number(todayIso.slice(5, 7)) - 1
  return Array.from({ length: months }, (_, i) => thirdFriday(y + Math.floor((m + i) / 12), (m + i) % 12))
}

/** An ISO date `n` days after another. */
export function isoDaysFrom(todayIso: string, n: number): string {
  return new Date(Date.parse(`${todayIso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
}

/** `20261016` / `2026-10-16` → `2026-10-16`; anything shorter is unusable. */
export function isoOfExpiry(raw: string | null | undefined): string | null {
  const d = String(raw ?? '').replace(/\D/g, '')
  if (d.length < 8) return null
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

/** A position row's expiry as an ISO date, falling back to the contract key's date segment. */
export function expiryIso(
  row: Pick<IbPositionRow, 'expiry' | 'lastTradeDateOrContractMonth' | 'contract_key'>,
): string | null {
  const direct = isoOfExpiry(String(row.expiry ?? row.lastTradeDateOrContractMonth ?? ''))
  if (direct) return direct
  const seg = (row.contract_key ?? '').split('|').find((s) => /^\d{8}$/.test(s))
  return seg ? isoOfExpiry(seg) : null
}

/** One expiry date and what falls on it. */
export interface ExpiryBucket<T> {
  /** The expiry as the first item on the date reported it (`YYYYMMDD` or ISO) — callers key on their own format. */
  expiry: string
  /** The same date, ISO. */
  iso: string
  items: T[]
}

/**
 * Items grouped by the day they expire, nearest first — the one grouping every
 * page that reads the book by expiry uses (§14.2): Expiry's desk, the Events
 * Book face's crossings, Positions' Expiries view and the Calendar's Expiries
 * layer. Items with no readable expiry are left out: a row that cannot be
 * placed in time would sit at one end of the list implying an urgency it has
 * not earned. Within a date, items keep the order they came in.
 */
export function bucketByExpiry<T>(
  items: readonly T[],
  expiryOf: (item: T) => string | null | undefined,
): ExpiryBucket<T>[] {
  const by = new Map<string, ExpiryBucket<T>>()
  for (const item of items) {
    const raw = expiryOf(item)
    const iso = isoOfExpiry(raw)
    if (!raw || !iso) continue
    const bucket = by.get(iso)
    if (bucket) bucket.items.push(item)
    else by.set(iso, { expiry: raw, iso, items: [item] })
  }
  return [...by.values()].sort((a, b) => a.iso.localeCompare(b.iso))
}
