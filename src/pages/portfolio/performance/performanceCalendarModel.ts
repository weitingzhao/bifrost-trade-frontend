import type { DayData } from '@/utils/ledger/performanceDayCells'

/** US-style week: Sun on the left, Sat on the right (Legacy calendar). */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export interface CalendarWeek {
  days: (CalendarDayCell | null)[]
}

export interface CalendarDayCell {
  date: string
  dayNum: number
  realized: number
  unrealized: number
  fillCount: number
  notional: number
}

export function buildCalendarGrid(yearMonth: string, dayMap: Map<string, DayData>): CalendarWeek[] {
  const [y, m] = yearMonth.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()

  /** 0 = Sun … 6 = Sat (matches WEEKDAY_LABELS). */
  const startDow = firstDay.getDay()

  const weeks: CalendarWeek[] = []
  let currentWeek: (CalendarDayCell | null)[] = new Array(startDow).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`
    const data = dayMap.get(dateStr)
    currentWeek.push({
      date: dateStr,
      dayNum: d,
      realized: data?.realized ?? 0,
      unrealized: data?.unrealized ?? 0,
      fillCount: data?.fillCount ?? 0,
      notional: data?.notional ?? 0,
    })
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek })
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push({ days: currentWeek })
  }

  return weeks
}
