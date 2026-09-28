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

export interface TrackLeg {
  key: string
  strike: number
  right: 'C' | 'P'
  /** −1 short, +1 long — the earliest fill's side names it. */
  side: -1 | 1
  /** Contracts at their largest. */
  qty: number
  /** Contracts still open, signed. */
  openQty: number
  openDate: string
  /** null while the leg is open. */
  flatDate: string | null
  expiryIso: string | null
  /** Realized for a flat leg; the monitor's mark for an open one; null when unknown. */
  pnl: number | null
  pnlIsMark: boolean
  fills: number
}

/** A roll: one leg flat and the next opened on the same day, inside one instance. */
export interface TrackJoint {
  date: string
  fromStrike: number
  toStrike: number
  /** Premium taken in (+, credit) or paid (−, debit) across the two legs that day. */
  net: number
}

/**
 * One instance on this symbol (design Rev .102): its legs in time, the rolls
 * that join them, and one label. `id` null gathers fills no instance claims —
 * drawn plain, since there is no record to open.
 */
export interface InstanceTrack {
  key: string
  id: number | null
  legs: TrackLeg[]
  joints: TrackJoint[]
  openDate: string
  /** null while any leg is open. */
  closeDate: string | null
  /** `#109 −6 170C` — the instance and its current (last) leg. */
  name: string
  /** Realized on flat legs plus the marks on open ones; null when an open leg has none. */
  pnl: number | null
  pnlIsMark: boolean
  fills: number
}

const dayOf = (e: Execution) => (e.trade_date ?? '').slice(0, 10)
const stripCash = (l: TrackLeg & { cashIn: number; cashOut: number; t0: number }): TrackLeg => {
  const { cashIn, cashOut, t0, ...leg } = l
  void cashIn
  void cashOut
  void t0
  return leg
}

/**
 * The ledger's fills on one underlying → one track per instance.
 *
 * A leg is `buildOptExecutionGroups`'s unit — one contract, all its fills —
 * inside the instance. A roll is read off the fills, not stored anywhere: a
 * leg going flat on the day another of the same right and side opens under the
 * same instance. Open legs take their mark from the monitor rows `My legs`
 * shows, and carry none when the monitor has no matching leg.
 */
export function instanceTracksFor(
  executions: readonly Execution[],
  symbol: string,
  legs: readonly SymbolLeg[],
): InstanceTrack[] {
  const sym = symbol.trim().toUpperCase()
  if (!sym) return []
  const mine = executions.filter((e) => (e.sec_type ?? '').toUpperCase() === 'OPT' && underlyingOf(e.symbol) === sym)
  const byInst = new Map<number | null, Execution[]>()
  for (const e of mine) {
    const id = e.strategy_instance_id ?? null
    byInst.set(id, [...(byInst.get(id) ?? []), e])
  }
  const out: InstanceTrack[] = []
  for (const [id, fills] of byInst) {
    const tl: (TrackLeg & { cashIn: number; cashOut: number; t0: number })[] = []
    for (const g of buildOptExecutionGroups([...fills])) {
      const dates = g.trades.map(dayOf).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
      if (dates.length === 0) continue
      const byTime = [...g.trades].sort((x, y) => (x.time ?? 0) - (y.time ?? 0))
      const side: -1 | 1 = isBuySide(byTime[0]?.side) ? 1 : -1
      const right = (g.option_right || 'C')[0].toUpperCase() === 'P' ? 'P' : 'C'
      const flat = g.status === 'realized'
      let pnl: number | null = null
      let pnlIsMark = false
      if (flat) pnl = Number.isFinite(g.realized_pnl) ? g.realized_pnl : null
      else {
        const leg = legs.find(
          (l) => l.kind === 'OPT' && l.strike === g.strike && (l.right ?? '') === right && expiryToIso(l.expiry) === expiryToIso(g.expiry),
        )
        if (leg && leg.unrealized != null && Number.isFinite(leg.unrealized)) {
          pnl = leg.unrealized
          pnlIsMark = true
        }
      }
      tl.push({
        key: `${id ?? 'none'}|${g.contract_key}`,
        strike: g.strike,
        right,
        side,
        qty: Math.max(g.buy_volume, g.sell_volume),
        openQty: g.net_qty,
        openDate: dates[0],
        flatDate: flat ? dates[dates.length - 1] : null,
        expiryIso: expiryToIso(g.expiry),
        pnl,
        pnlIsMark,
        fills: g.trades.length,
        cashIn: g.sell_premium,
        cashOut: g.buy_cost,
        t0: byTime[0]?.time ?? 0,
      })
    }
    if (tl.length === 0) continue
    // By the first fill, not the day: a same-day roll opens the new leg after the old one's.
    tl.sort((a, b) => a.openDate.localeCompare(b.openDate) || a.t0 - b.t0)
    const joints: TrackJoint[] = []
    if (id != null) {
      for (const a of tl) {
        if (a.flatDate == null) continue
        const b = tl.find((x) => x !== a && x.openDate === a.flatDate && x.right === a.right && x.side === a.side)
        if (!b) continue
        // A short roll buys the old leg back and sells the new one; a long roll the reverse.
        const net = a.side < 0 ? b.cashIn - a.cashOut : a.cashIn - b.cashOut
        joints.push({ date: a.flatDate, fromStrike: a.strike, toStrike: b.strike, net })
      }
    }
    const last = tl[tl.length - 1]
    const open = tl.some((l) => l.flatDate == null)
    const pnls = tl.map((l) => l.pnl)
    // The current leg as held: its open size while open, its full size once flat.
    const q = last.flatDate == null ? Math.abs(last.openQty) : last.qty
    const leg = `${last.side < 0 ? '−' : '+'}${q} ${last.strike}${last.right}`
    out.push({
      key: `inst:${id ?? 'none'}`,
      id,
      legs: tl.map(stripCash),
      joints,
      openDate: tl[0].openDate,
      closeDate: open ? null : tl.map((l) => l.flatDate!).sort().pop()!,
      name: id != null ? `#${id} ${leg}` : `no instance · ${leg}`,
      pnl: pnls.every((v) => v != null) ? pnls.reduce((x, v) => x + (v as number), 0) : null,
      pnlIsMark: tl.some((l) => l.pnlIsMark),
      fills: tl.reduce((x, l) => x + l.fills, 0),
    })
  }
  return out.sort((a, b) => a.openDate.localeCompare(b.openDate))
}

export interface Holding {
  qty: number
  /** Blended across accounts; null when no account reports a cost. */
  avg: number | null
  /** Shares under an open covered call, by the instance that writes against them. */
  backing: { id: number; qty: number }[]
  free: number
}

/**
 * Shares held now (design Rev .102's lime line): the monitor's stock rows for
 * this name, blended; each open instance short calls on it claims 100 shares a
 * contract as backing, in the order the instances opened, and what is left is
 * free to write against. Stock legs are never attributed to instances, so
 * backing is read from the calls, not from a share fill.
 */
export function holdingFor(legs: readonly SymbolLeg[], tracks: readonly InstanceTrack[]): Holding | null {
  const stk = legs.filter((l) => l.kind === 'STK' && l.qty > 0)
  const qty = stk.reduce((a, l) => a + l.qty, 0)
  if (qty <= 0) return null
  const costed = stk.filter((l) => l.avgCost != null && Number.isFinite(l.avgCost))
  const cq = costed.reduce((a, l) => a + l.qty, 0)
  const avg = cq > 0 ? costed.reduce((a, l) => a + l.qty * (l.avgCost as number), 0) / cq : null
  let left = qty
  const backing: Holding['backing'] = []
  for (const t of tracks) {
    if (t.id == null || left <= 0) continue
    const calls = t.legs
      .filter((l) => l.flatDate == null && l.right === 'C' && l.openQty < 0)
      .reduce((a, l) => a + Math.abs(l.openQty) * 100, 0)
    if (calls <= 0) continue
    const q = Math.min(calls, left)
    backing.push({ id: t.id, qty: q })
    left -= q
  }
  return { qty, avg, backing, free: left }
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
