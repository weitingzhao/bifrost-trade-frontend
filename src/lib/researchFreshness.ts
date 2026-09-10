import type { LampTone } from '@/lib/lampTone'

/**
 * The same four states `lampTone` renders. Kept under this name because 16
 * modules already speak it; there is only one definition now.
 */
export type LampColor = LampTone

export function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const target = selectedDate || todayIso()
  if (!td) return 'yellow'
  if (td === target) return 'green'
  return 'yellow'
}
