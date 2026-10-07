import type { LampTone } from '@/lib/lampTone'
import { etTodayIso } from '@/lib/freshness'

/**
 * The same four states `lampTone` renders. Kept under this name because 16
 * modules already speak it; there is only one definition now.
 */
export type LampColor = LampTone

/** The ISO date `n` days before `today` — the far edge of a bars window. */
export function daysBack(today: string, n: number): string {
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export function datePrefix(value: string | null | undefined): string | null {
  if (!value) return null
  const s = String(value).trim()
  return s.length >= 10 ? s.slice(0, 10) : null
}

/** Fresh = matches selected/today trade_date; stale = older date present; empty = no data. */
export function freshnessLamp(
  tradeDate: string | null | undefined,
  selectedDate: string,
  hasError: boolean,
  hasData: boolean,
): LampColor {
  if (hasError) return 'red'
  if (!hasData) return 'gray'
  const td = datePrefix(tradeDate)
  const target = selectedDate || etTodayIso()
  if (!td) return 'yellow'
  if (td === target) return 'green'
  return 'yellow'
}
