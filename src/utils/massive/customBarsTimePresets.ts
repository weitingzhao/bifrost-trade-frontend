import { fetchMarketTradingDay } from '@/api/market'
import { nyCalendarDateIso as nyTodayIso } from '@/utils/optionDiscovery/strikePresets'

const NY = 'America/New_York'

function nyCalendarDateIso(nowMs: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NY,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(nowMs))
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  const d = parts.find(p => p.type === 'day')?.value
  if (y && m && d) return `${y}-${m}-${d}`
  return new Date(nowMs).toISOString().slice(0, 10)
}

function nyYmdParts(utcMs: number): { ymd: string; hour: number; minute: number } {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: NY,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = f.formatToParts(new Date(utcMs))
  const y = parts.find(p => p.type === 'year')?.value
  const mo = parts.find(p => p.type === 'month')?.value
  const d = parts.find(p => p.type === 'day')?.value
  const hh = parseInt(parts.find(p => p.type === 'hour')?.value ?? '', 10)
  const mm = parseInt(parts.find(p => p.type === 'minute')?.value ?? '', 10)
  const ymd = y && mo && d ? `${y}-${mo}-${d}` : ''
  return { ymd, hour: hh, minute: mm }
}

export function utcMsForNyWallClock(ymd: string, hour24: number, minute: number): number | null {
  const [Y, M, D] = ymd.split('-').map(s => parseInt(s, 10))
  if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return null
  const start = Date.UTC(Y, M - 1, D, 4, 0, 0) - 12 * 3600000
  const end = Date.UTC(Y, M - 1, D + 1, 8, 0, 0) + 12 * 3600000
  for (let ms = start; ms < end; ms += 60000) {
    const p = nyYmdParts(ms)
    if (p.ymd === ymd && p.hour === hour24 && p.minute === minute) return ms
  }
  return null
}

function previousNyCalendarDate(ymd: string): string {
  let ms = utcMsForNyWallClock(ymd, 12, 0)
  if (ms == null) return ymd
  const target = ymd
  ms -= 3600000
  let guard = 0
  while (nyCalendarDateIso(ms) === target && guard < 48) {
    ms -= 3600000
    guard++
  }
  return nyCalendarDateIso(ms)
}

export function addCalendarDaysNy(ymd: string, deltaDays: number): string {
  let cur = ymd
  const n = Math.abs(deltaDays)
  const forward = deltaDays >= 0
  for (let i = 0; i < n; i++) {
    if (forward) {
      let ms = utcMsForNyWallClock(cur, 12, 0)
      if (ms == null) return cur
      const start = nyCalendarDateIso(ms)
      ms += 3600000
      let guard = 0
      while (nyCalendarDateIso(ms) === start && guard < 48) {
        ms += 3600000
        guard++
      }
      cur = nyCalendarDateIso(ms)
    } else {
      cur = previousNyCalendarDate(cur)
    }
  }
  return cur
}

export function presetNyRegularSessionForDate(ymd: string): { startMs: number; endMs: number } | null {
  const open = utcMsForNyWallClock(ymd, 9, 30)
  const close = utcMsForNyWallClock(ymd, 16, 0)
  if (open == null || close == null) return null
  return { startMs: open, endMs: close }
}

export async function findLastNyTradingDay(): Promise<string | null> {
  let ymd = nyTodayIso()
  for (let i = 0; i < 15; i++) {
    const r = await fetchMarketTradingDay(ymd)
    if (r.is_trading_day) return ymd
    ymd = addCalendarDaysNy(ymd, -1)
  }
  return null
}
