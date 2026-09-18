/**
 * A closed trade's path, not just its two ends.
 *
 * Review's whole method is to separate questions a single P&L number blurs, and
 * most of them turn on *when* inside the trade: what the best mark was, how
 * much of it was given back, how long a loser stayed open after its worst mark,
 * what the do-nothing branch would have paid. Every one of those needs the
 * position marked on each day it was held.
 *
 * That mark is `market.option_daily` — the contract's own daily OHLCV. It was
 * recorded as missing on every Review page until 2026-09-18; measuring it says
 * otherwise (see `api/marketData/dailyBars.ts` for the coverage count).
 *
 * The one thing the path still cannot supply is the **plan**. Discipline is
 * realised against the plan's own exit and plan quality is that exit against
 * the best mark; the best mark is here now, the planned exit is not, so both
 * gaps stay marked rather than half-computed.
 *
 * ## The arithmetic
 *
 * `pl(d) = cash(d) + openQty(d) × mark(d) × 100`, with `cash` the Ledger's own
 * signed convention. On the last day the contract is flat, `openQty` is zero and
 * `pl` lands exactly on the Ledger's realised figure — one computation, cited
 * twice (§14.2).
 */
import { businessDaysBetween, daysBetween } from '@/lib/isoDate'
import type { DailyBar } from '@/api/marketData/dailyBars'
import type { ReviewFill, ReviewTrade } from '@/utils/reviewTrades'

export interface MarkPoint {
  date: string
  /** Contracts open at this close, signed: positive long, negative short. */
  openQty: number
  /** The contract's close that day. */
  mark: number
  /** Position P&L marked at this close. */
  pl: number
}

export interface MarkPath {
  /** The days the position was actually held, earliest first. */
  held: MarkPoint[]
  /** Had the closing fills never happened — the days after the exit, up to the last bar. */
  ifHeld: MarkPoint[]
  best: number
  bestDate: string
  worst: number
  worstDate: string
  /** The realised figure the path ends on. */
  realised: number
  /** Share of the best mark the exit actually landed. Null when the best was not positive. */
  captureOfBest: number | null
  /** Calendar days from the worst mark to the exit. Null when the worst mark *is* the exit. */
  cutLatencyDays: number | null
  /** True when the position marked below zero at some point while held. */
  everUnderwater: boolean
  /** Bars found, against business days in the window — partial coverage is a real state. */
  bars: number
  businessDays: number
}

/** What the position would have paid had it been carried into expiry. */
export interface ExpiryBranch {
  /** Underlying close on the last session at or before expiry. */
  underlying: number
  /** Per-share value of the contract at expiry — intrinsic, which at expiry is exact. */
  intrinsic: number
  pl: number
  date: string
}

function signedQty(f: ReviewFill): number {
  return f.side === 'buy' ? f.qty : -f.qty
}

/** Cash and open quantity from every fill dated on or before `date`. */
function upTo(fills: readonly ReviewFill[], date: string): { cash: number; openQty: number } {
  let cash = 0
  let openQty = 0
  for (const f of fills) {
    if (f.date == null || f.date > date) continue
    cash += f.cash
    openQty += signedQty(f)
  }
  return { cash, openQty }
}

/**
 * The path, or null when no bar in the window carries a close.
 *
 * `bars` covers the whole window the caller asked for — from the opening fill
 * to the last session before expiry — so the days after the exit are in the same
 * series and become the "had I stayed" branch rather than a second request.
 */
export function buildMarkPath(trade: ReviewTrade, bars: readonly DailyBar[]): MarkPath | null {
  const opened = trade.openedOn
  const closed = trade.closedOn
  if (!opened || !closed) return null

  const usable = bars.filter((b) => b.close != null && b.date >= opened)
  if (usable.length === 0) return null

  const openingFills = trade.fills.filter((f) => f.date != null && f.date <= opened)

  const held: MarkPoint[] = []
  const ifHeld: MarkPoint[] = []
  for (const bar of usable) {
    const mark = bar.close as number
    if (bar.date <= closed) {
      const { cash, openQty } = upTo(trade.fills, bar.date)
      held.push({ date: bar.date, openQty, mark, pl: cash + openQty * mark * 100 })
    }
    if (bar.date >= closed) {
      const cash = openingFills.reduce((a, f) => a + f.cash, 0)
      const openQty = openingFills.reduce((a, f) => a + signedQty(f), 0)
      ifHeld.push({ date: bar.date, openQty, mark, pl: cash + openQty * mark * 100 })
    }
  }
  if (held.length === 0) return null

  // The exit is not always a session the vendor has a bar for: a contract booked
  // out the day after expiry, or on a Saturday, leaves the last bar holding a
  // residual position — three of the book's sixty-seven closed trades. The
  // contract is flat on its closing date by construction, so close the series
  // there on every fill's cash, which is the Ledger's own realised figure.
  const flatPl = trade.fills.reduce((a, f) => a + f.cash, 0)
  if (held[held.length - 1].date !== closed) {
    held.push({ date: closed, openQty: 0, mark: held[held.length - 1].mark, pl: flatPl })
  } else {
    held[held.length - 1] = { ...held[held.length - 1], openQty: 0, pl: flatPl }
  }

  let best = held[0]
  let worst = held[0]
  for (const p of held) {
    if (p.pl > best.pl) best = p
    if (p.pl < worst.pl) worst = p
  }
  const realised = held[held.length - 1].pl
  const latency = worst.date === closed ? null : daysBetween(worst.date, closed)

  return {
    held,
    ifHeld,
    best: best.pl,
    bestDate: best.date,
    worst: worst.pl,
    worstDate: worst.date,
    realised,
    captureOfBest: best.pl > 0 ? realised / best.pl : null,
    cutLatencyDays: latency,
    everUnderwater: worst.pl < 0,
    bars: held.length,
    businessDays: businessDaysBetween(opened, closed),
  }
}

/**
 * The do-nothing branch.
 *
 * At expiry a contract is worth its intrinsic value and nothing else, so this
 * one counterfactual is exact rather than modelled — provided expiry has passed
 * and the underlying's close that session is on hand.
 */
export function buildExpiryBranch(trade: ReviewTrade, underlying: readonly DailyBar[]): ExpiryBranch | null {
  if (!trade.expiry || !trade.openedOn) return null
  const atExpiry = underlying.filter((b) => b.close != null && b.date <= trade.expiry).pop()
  if (atExpiry == null) return null

  const opened = trade.openedOn
  const openingFills = trade.fills.filter((f) => f.date != null && f.date <= opened)
  const cash = openingFills.reduce((a, f) => a + f.cash, 0)
  const openQty = openingFills.reduce((a, f) => a + signedQty(f), 0)
  if (openQty === 0) return null

  const spot = atExpiry.close as number
  const intrinsic =
    trade.right === 'P' ? Math.max(0, trade.strike - spot) : Math.max(0, spot - trade.strike)

  return { underlying: spot, intrinsic, pl: cash + openQty * intrinsic * 100, date: atExpiry.date }
}
