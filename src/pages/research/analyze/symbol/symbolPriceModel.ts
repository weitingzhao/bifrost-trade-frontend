/**
 * The Overview price chart's arithmetic — windows, weekly aggregation, and the
 * trade-history overlay (Rev 2026-09-26.98, Shell Spec §10).
 *
 * An option trade has a natural drawing on the underlying's candles: strike is
 * a position on the price axis, the holding period a span on the time axis.
 * Everything here turns ledger fill groups into those spans; the component
 * only places them with the chart's own scales.
 */
import type { Bar } from '@/types/market'
import type { Execution } from '@/types/positions'
import { buildOptExecutionGroups, isBuySide } from '@/utils/ledger/optExecutionGroups'
import type { SymbolLeg } from '@/pages/research/analyze/symbol/selectLegs'

/** Window presets — beyond 130 sessions the candles aggregate to weekly. */
export const PRICE_WINDOWS = [
  { value: '60', label: '60d' },
  { value: '120', label: '120d' },
  { value: '250', label: '250d' },
  { value: 'all', label: '2y' },
] as const

export type PriceWindow = (typeof PRICE_WINDOWS)[number]['value']

export const WEEKLY_THRESHOLD_SESSIONS = 130

export function sessionsForWindow(win: PriceWindow, total: number): number {
  if (win === 'all') return total
  return Math.min(total, parseInt(win, 10))
}

export function aggFor(sessions: number): number {
  return sessions > WEEKLY_THRESHOLD_SESSIONS ? 5 : 1
}

/** Oldest→newest daily bars in, one bar per `agg` sessions out (last bar may be partial). */
export function aggregateBars(daily: Bar[], agg: number): Bar[] {
  if (agg <= 1) return daily
  const out: Bar[] = []
  // Anchor the grouping at the newest bar so "this week" is always whole.
  const rem = daily.length % agg
  for (let start = rem === 0 ? 0 : rem - agg; start < daily.length; start += agg) {
    const s0 = Math.max(0, start)
    const s1 = Math.min(daily.length, start + agg)
    if (s1 <= s0) continue
    const slice = daily.slice(s0, s1)
    let high = -Infinity
    let low = Infinity
    let volume = 0
    let hasVol = false
    for (const b of slice) {
      if (Number.isFinite(b.high)) high = Math.max(high, b.high)
      if (Number.isFinite(b.low)) low = Math.min(low, b.low)
      if (b.volume != null && Number.isFinite(b.volume)) {
        volume += Number(b.volume)
        hasVol = true
      }
    }
    out.push({
      time: slice[slice.length - 1].time,
      open: slice[0].open,
      high: Number.isFinite(high) ? high : slice[0].high,
      low: Number.isFinite(low) ? low : slice[0].low,
      close: slice[slice.length - 1].close,
      volume: hasVol ? volume : undefined,
    })
  }
  return out
}

/** Epoch seconds → UTC ISO date. Daily bars stamp midnight UTC. */
export function barIsoDate(timeSec: number): string {
  return new Date(timeSec * 1000).toISOString().slice(0, 10)
}

/** '20261016' | '2026-10-16' → '2026-10-16' (null when unparsable). */
export function expiryToIso(raw: string | null | undefined): string | null {
  const clean = (raw ?? '').replace(/-/g, '')
  if (!/^\d{8}$/.test(clean)) return null
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
}

/** Mon–Fri sessions strictly after `fromIso` up to and including `toIso`. */
export function sessionsUntil(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`)
  const to = new Date(`${toIso}T00:00:00Z`)
  if (!(from.getTime() < to.getTime())) return 0
  let n = 0
  const d = new Date(from)
  while (d.getTime() < to.getTime()) {
    d.setUTCDate(d.getUTCDate() + 1)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) n++
  }
  return n
}

/** The underlying of an OCC option symbol ('NVDA  260327C00182500' → 'NVDA'). */
export function underlyingOf(occSymbol: string | null | undefined): string {
  return (occSymbol ?? '').split(' ')[0].trim().toUpperCase()
}

export interface TradeSegment {
  key: string
  /** e.g. `STO 350P` — the earliest fill's side names the position. */
  name: string
  strike: number
  right: 'C' | 'P'
  openDate: string
  /** null while the position is open. */
  closeDate: string | null
  expiryIso: string | null
  /** Realized for closed pairs; the leg's mark for open ones; null when unknown. */
  pnl: number | null
  pnlIsMark: boolean
  fills: number
}

/**
 * Ledger fills for one underlying → holding segments at strike level.
 *
 * A group is `buildOptExecutionGroups`'s unit — one contract, every fill. Open
 * or closed follows its net quantity; an open group joins the live legs (the
 * same rows `SymbolMyLegs` shows) for a mark P&L, and carries none when the
 * monitor has no matching leg. Multi-leg structures and assignment end-marks
 * wait for their data shape (Rev .98 defers them).
 */
export function tradeSegmentsFor(
  executions: readonly Execution[],
  symbol: string,
  legs: readonly SymbolLeg[],
): TradeSegment[] {
  const sym = symbol.trim().toUpperCase()
  if (!sym) return []
  const mine = executions.filter(
    (e) => (e.sec_type ?? '').toUpperCase() === 'OPT' && underlyingOf(e.symbol) === sym,
  )
  if (mine.length === 0) return []
  const groups = buildOptExecutionGroups([...mine])
  const out: TradeSegment[] = []
  for (const g of groups) {
    const dates = g.trades
      .map((t) => (t.trade_date ?? '').slice(0, 10))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()
    if (dates.length === 0) continue
    const openDate = dates[0]
    const closed = g.status === 'realized'
    const closeDate = closed ? dates[dates.length - 1] : null
    const earliest = g.trades[g.trades.length - 1]
    const right = (g.option_right || 'C')[0].toUpperCase() === 'P' ? 'P' : 'C'
    const strikeLabel = Number.isInteger(g.strike) ? String(g.strike) : String(g.strike)
    const name = `${isBuySide(earliest?.side) ? 'BTO' : 'STO'} ${strikeLabel}${right}`
    let pnl: number | null = null
    let pnlIsMark = false
    if (closed) {
      pnl = Number.isFinite(g.realized_pnl) ? g.realized_pnl : null
    } else {
      const leg = legs.find(
        (l) =>
          l.kind === 'OPT' &&
          l.strike === g.strike &&
          (l.right ?? '') === right &&
          expiryToIso(l.expiry) === expiryToIso(g.expiry),
      )
      if (leg && leg.unrealized != null && Number.isFinite(leg.unrealized)) {
        pnl = leg.unrealized
        pnlIsMark = true
      }
    }
    out.push({
      key: `${g.contract_key}|${openDate}`,
      name,
      strike: g.strike,
      right,
      openDate,
      closeDate,
      expiryIso: expiryToIso(g.expiry),
      pnl,
      pnlIsMark,
      fills: g.trades.length,
    })
  }
  // Oldest first, so labels stack deterministically.
  return out.sort((a, b) => a.openDate.localeCompare(b.openDate))
}

/**
 * A date's index among the daily sessions (ascending ISO dates). A fill on a
 * day the bars miss lands on the last session at or before it; a date before
 * the whole history returns null (the caller clips it at the left edge).
 */
export function sessionIndexFor(dates: readonly string[], iso: string): number | null {
  if (dates.length === 0) return null
  if (iso < dates[0]) return null
  let lo = 0
  let hi = dates.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (dates[mid] <= iso) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Which aggregated bar a daily offset falls into, for the end-anchored grouping
 * `aggregateBars` uses (the oldest group may be short).
 */
export function aggIndexFor(dailyLen: number, agg: number, offset: number): number {
  if (agg <= 1) return offset
  const rem = dailyLen % agg
  if (rem > 0 && offset < rem) return 0
  return Math.floor((offset - rem) / agg) + (rem > 0 ? 1 : 0)
}

/** The smallest window that brings a fill `sessionsAgo` back into view. */
export function windowForSessionsAgo(sessionsAgo: number): PriceWindow {
  for (const w of PRICE_WINDOWS) {
    if (w.value === 'all') continue
    if (parseInt(w.value, 10) > sessionsAgo + 3) return w.value
  }
  return 'all'
}

/** '+$310' · '−$220' — the design's sign convention (true minus, not hyphen). */
export function fmtPl(v: number): string {
  const n = Math.round(Math.abs(v))
  return `${v >= 0 ? '+$' : '−$'}${n.toLocaleString('en-US')}`
}
