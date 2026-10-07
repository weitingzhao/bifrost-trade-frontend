/**
 * Return basis from the stored daily net liquidation (DESIGN_CONTRACTS §14.5,
 * SNAPSHOT-SPEC §1.1; api 0.12.0 `GET /portfolio/nav-history`).
 *
 * Money crossing the account boundary is not return. With one closing NAV per
 * account and session, return is measured on the investment gain:
 *
 *   gain = NAV(end) − NAV(start) − external flows in between
 *
 * External flows are the broker's deposits and withdrawals — Transfer &
 * Pay's `Transfer` kind. Dividends, fees, tax and interest are not flows: they
 * are the book earning or paying, and stay in the gain.
 *
 * Time-weighted return chains one sub-period per pair of consecutive stored
 * sessions: r = (NAV₁ − F) ÷ NAV₀ − 1, a flow taken at the close of the New
 * York date it posted. A sub-period reads only the accounts that have a closing
 * NAV at both of its ends; an account missing at either end is left out of that
 * sub-period and counted, never filled in. Modified Dietz is the one-period
 * fallback over the same span, each flow weighted by the share of the span it
 * was in the account.
 *
 * The series starts the night the snapshot started. A range that starts
 * earlier is measured from the first stored session and says so — the start
 * of the range itself is not recorded.
 */
import { etDate } from '@/lib/freshness'
import { kindOf } from '@/utils/transactionKind'
import type { AccountTransaction } from '@/types/trading'
import type { NavRow } from '@/lib/schemas/snapshots'

/** Epoch seconds → the New York calendar date, `YYYY-MM-DD`. */
export function nyDateOf(epochSec: number): string {
  return etDate(epochSec * 1000)
}

export interface ExternalFlow {
  date: string
  accountId: string
  amount: number
}

/** Deposits and withdrawals (the `Transfer` kind), dated by New York calendar day. */
export function externalFlows(transactions: readonly AccountTransaction[]): ExternalFlow[] {
  const out: ExternalFlow[] = []
  for (const t of transactions) {
    if (kindOf(t) !== 'Transfer') continue
    const ts = Number(t.ts)
    const amount = Number(t.amount)
    if (!Number.isFinite(ts) || !Number.isFinite(amount)) continue
    out.push({ date: nyDateOf(ts), accountId: t.account_id, amount })
  }
  return out
}

export interface ReturnBasis {
  /** Stored sessions inside the range, oldest first. */
  sessions: string[]
  /** The session the measurement starts from: the last one before the range, else the first inside it. */
  startDate: string | null
  /** True when a stored close exists for the day before the range starts. */
  startRecorded: boolean
  endDate: string | null
  navStart: number | null
  navEnd: number | null
  /** Deposits − withdrawals after the start session through the end session (accounts at both ends). */
  flows: number
  flowRows: number
  gain: number | null
  twr: number | null
  subPeriods: number
  /** Account-sessions left out of a sub-period because the account had no closing NAV at one end. */
  accountsLeftOut: number
  dietz: number | null
}

type Book = Map<string, Map<string, number>>

function bookOf(nav: readonly NavRow[]): Book {
  const book: Book = new Map()
  for (const r of nav) {
    if (r.net_liquidation == null || !Number.isFinite(r.net_liquidation)) continue
    const day = book.get(r.snapshot_date) ?? new Map<string, number>()
    day.set(r.account_id, r.net_liquidation)
    book.set(r.snapshot_date, day)
  }
  return book
}

function flowsBetween(flows: readonly ExternalFlow[], after: string, through: string, accounts: Set<string>) {
  let sum = 0
  let n = 0
  for (const f of flows) {
    if (f.date > after && f.date <= through && accounts.has(f.accountId)) {
      sum += f.amount
      n += 1
    }
  }
  return { sum, n }
}

const DAY_MS = 86_400_000
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)

export function returnBasisFromNav(input: {
  nav: readonly NavRow[]
  flows: readonly ExternalFlow[]
  sinceStr: string
  untilStr: string
}): ReturnBasis {
  const book = bookOf(input.nav)
  const all = [...book.keys()].sort()
  const inRange = all.filter((d) => d >= input.sinceStr && d <= input.untilStr)
  const before = all.filter((d) => d < input.sinceStr)
  const startDate = before.length ? before[before.length - 1] : (inRange[0] ?? null)
  const startRecorded = before.length > 0
  const endDate = inRange.length ? inRange[inRange.length - 1] : null
  const empty: ReturnBasis = {
    sessions: inRange,
    startDate,
    startRecorded,
    endDate,
    navStart: null,
    navEnd: null,
    flows: 0,
    flowRows: 0,
    gain: null,
    twr: null,
    subPeriods: 0,
    accountsLeftOut: 0,
    dietz: null,
  }
  if (startDate == null || endDate == null || startDate === endDate) {
    const only = endDate ? book.get(endDate) : undefined
    return { ...empty, navEnd: only ? [...only.values()].reduce((a, b) => a + b, 0) : null }
  }

  // Time-weighted: one sub-period per pair of consecutive stored sessions.
  const path = all.filter((d) => d >= startDate && d <= endDate)
  let growth = 1
  let subPeriods = 0
  let accountsLeftOut = 0
  for (let i = 1; i < path.length; i++) {
    const a = book.get(path[i - 1])!
    const b = book.get(path[i])!
    const both = new Set([...a.keys()].filter((k) => b.has(k)))
    accountsLeftOut += new Set([...a.keys(), ...b.keys()]).size - both.size
    if (both.size === 0) continue
    const nav0 = [...both].reduce((s, k) => s + a.get(k)!, 0)
    const nav1 = [...both].reduce((s, k) => s + b.get(k)!, 0)
    if (!(nav0 > 0)) continue
    const f = flowsBetween(input.flows, path[i - 1], path[i], both).sum
    growth *= (nav1 - f) / nav0
    subPeriods += 1
  }

  // The balance rows and Modified Dietz: the accounts with a close at both ends.
  const s = book.get(startDate)!
  const e = book.get(endDate)!
  const ends = new Set([...s.keys()].filter((k) => e.has(k)))
  const navStart = [...ends].reduce((sum, k) => sum + s.get(k)!, 0)
  const navEnd = [...ends].reduce((sum, k) => sum + e.get(k)!, 0)
  const { sum: flows, n: flowRows } = flowsBetween(input.flows, startDate, endDate, ends)
  const gain = ends.size ? navEnd - navStart - flows : null
  const span = daysBetween(startDate, endDate)
  let weighted = 0
  for (const f of input.flows) {
    if (f.date > startDate && f.date <= endDate && ends.has(f.accountId)) {
      weighted += f.amount * (daysBetween(f.date, endDate) / span)
    }
  }
  const denom = navStart + weighted
  return {
    ...empty,
    navStart: ends.size ? navStart : null,
    navEnd: ends.size ? navEnd : null,
    flows,
    flowRows,
    gain,
    twr: subPeriods > 0 ? growth - 1 : null,
    subPeriods,
    accountsLeftOut,
    dietz: gain != null && denom > 0 ? gain / denom : null,
  }
}
