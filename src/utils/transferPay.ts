export type RangePreset =
  | 'last_365'
  | 'mtd'
  | 'qtd'
  | 'ytd'
  | 'last_month'
  | 'last_quarter'
  | 'last_30'
  | 'last_business_day'

export type SummaryMode = 'year' | 'quarter' | 'month'

export type SummaryTypeKey = 'deposit' | 'withdrawal' | 'dividend' | 'other'

export const RANGE_PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'last_365', label: 'Last 365 calendar days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'qtd', label: 'Quarter to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'last_30', label: 'Last 30 calendar days' },
  { value: 'last_business_day', label: 'Last business day' },
]

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}${String(m).padStart(2, '0')}${String(day).padStart(2, '0')}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, delta: number): Date {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + delta)
  return nd
}

export function getRangeForPreset(preset: RangePreset): {
  fromDate: string
  toDate: string
  sinceTs: number
  untilTs: number
} {
  const today = startOfDay(new Date())
  const y = today.getFullYear()
  const m = today.getMonth()

  let from = today
  let to = today

  if (preset === 'last_365') {
    from = addDays(today, -365)
    to = today
  } else if (preset === 'mtd') {
    from = new Date(y, m, 1)
    to = today
  } else if (preset === 'qtd') {
    from = new Date(y, Math.floor(m / 3) * 3, 1)
    to = today
  } else if (preset === 'ytd') {
    from = new Date(y, 0, 1)
    to = today
  } else if (preset === 'last_month') {
    const firstThisMonth = new Date(y, m, 1)
    const lastPrevMonth = addDays(firstThisMonth, -1)
    from = new Date(lastPrevMonth.getFullYear(), lastPrevMonth.getMonth(), 1)
    to = lastPrevMonth
  } else if (preset === 'last_quarter') {
    const currentQ = Math.floor(m / 3)
    const prevQ = (currentQ + 3 - 1) % 4
    const yearForPrev = currentQ === 0 ? y - 1 : y
    const prevStart = new Date(yearForPrev, prevQ * 3, 1)
    const currQStart = new Date(y, currentQ * 3, 1)
    from = prevStart
    to = addDays(currQStart, -1)
  } else if (preset === 'last_30') {
    from = addDays(today, -30)
    to = today
  } else if (preset === 'last_business_day') {
    const dow = today.getDay()
    const prev = dow === 1 ? addDays(today, -3) : dow === 0 ? addDays(today, -2) : addDays(today, -1)
    from = prev
    to = prev
  }

  return {
    fromDate: formatYmd(from),
    toDate: formatYmd(to),
    sinceTs: Math.floor(from.getTime() / 1000),
    untilTs: Math.floor(addDays(to, 1).getTime() / 1000),
  }
}

export function getSummaryType(raw: string | null | undefined): SummaryTypeKey {
  const t = (raw ?? '').toLowerCase()
  if (t === 'deposit') return 'deposit'
  if (t === 'withdrawal') return 'withdrawal'
  if (t === 'dividend') return 'dividend'
  return 'other'
}

export function getPeriodKey(ts: number | string, mode: SummaryMode): string {
  const sec = Number(ts)
  if (!Number.isFinite(sec)) return ''
  const d = new Date(sec > 1e12 ? sec : sec * 1000)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth()
  if (Number.isNaN(y) || Number.isNaN(mo)) return ''
  if (mode === 'year') return String(y)
  if (mode === 'month') return `${y}-${String(mo + 1).padStart(2, '0')}`
  return `${y} Q${Math.floor(mo / 3) + 1}`
}
