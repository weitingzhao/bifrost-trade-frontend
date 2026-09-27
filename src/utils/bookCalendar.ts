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
export function expiryIso(
  row: Pick<IbPositionRow, 'expiry' | 'lastTradeDateOrContractMonth' | 'contract_key'>,
): string | null {
  const raw = String(row.expiry ?? row.lastTradeDateOrContractMonth ?? '')
  const d = raw.replace(/\D/g, '')
  if (d.length < 8) {
    const seg = (row.contract_key ?? '').split('|').find((s) => /^\d{8}$/.test(s))
    if (!seg) return null
    return `${seg.slice(0, 4)}-${seg.slice(4, 6)}-${seg.slice(6, 8)}`
  }
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}
