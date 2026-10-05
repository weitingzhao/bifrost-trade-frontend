/**
 * Calendar · closed and half days — NYSE's holidays and early closes for this
 * year and next (`/api/market/market/holidays`), the same read and cache entry
 * the freshness rule's trading calendar is built from (`useNyseHolidays`).
 * Not a layer the reader toggles: it marks the cell (`Labor Day · market
 * closed`, `Thanksgiving · early close 13:00 ET`).
 */
import { useMemo } from 'react'
import type { MarketHolidayRow } from '@/api/market'
import { useNyseHolidays } from '@/hooks/useTradingCalendar'
import { etClock } from '@/lib/freshness'

export interface CalendarHoliday {
  d: string
  kind: 'closed' | 'early-close'
  /** `Labor Day · market closed`, `Thanksgiving · early close 13:00 ET`. */
  label: string
}

export function holidayDays(rows: readonly MarketHolidayRow[]): CalendarHoliday[] {
  const out: CalendarHoliday[] = []
  for (const r of rows) {
    const d = (r.holiday_date ?? '').slice(0, 10)
    if (!d) continue
    const name = r.label || r.name || 'Holiday'
    if (r.status === 'early-close') {
      const close = r.close_time ? Date.parse(r.close_time) : NaN
      out.push({
        d,
        kind: 'early-close',
        label: `${name} · early close${Number.isFinite(close) ? ` ${etClock(close)} ET` : ''}`,
      })
    } else {
      out.push({ d, kind: 'closed', label: `${name} · market closed` })
    }
  }
  return out.sort((a, b) => a.d.localeCompare(b.d))
}

export function useCalendarHolidays(): { days: CalendarHoliday[]; state: 'loading' | 'ready' | 'failed' } {
  const q = useNyseHolidays()
  const days = useMemo(() => holidayDays(q.data ?? []), [q.data])
  return { days, state: q.isError && !q.data ? 'failed' : q.isPending ? 'loading' : 'ready' }
}
