/**
 * Single trade's picker (design Rev .104, Owner 2026-09-29: a row of
 * "#id SYM" pills was too thin to choose from). The choice is a closed trade,
 * not a symbol — the same name appears once per trade — so the list carries
 * what a review is picked by: when it closed, what it made, and where it sat.
 *
 * Filters All · Won · Lost · Broke plan, a search over symbol, # and rule, and
 * grouping None · Symbol · Expiry (month of the contract's expiry), each group
 * headed by its count and net. "Broke plan" needs a plan linked to the trade,
 * and none is (`REVIEW_UNRECORDED.plan`), so it counts nothing and says so.
 */
import type { ReviewTrade } from '@/utils/reviewTrades'

export type PickOutcome = 'all' | 'won' | 'lost' | 'broke'
export type PickGroup = 'none' | 'sym' | 'exp'

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export const OUTCOMES: { key: PickOutcome; label: string; test: (t: ReviewTrade) => boolean | null }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'won', label: 'Won', test: (t) => t.realised >= 0 },
  { key: 'lost', label: 'Lost', test: (t) => t.realised < 0 },
  // No plan is linked to any position, so "broke its plan" is unknowable — null, not false.
  { key: 'broke', label: 'Broke plan', test: () => null },
]

export function matchesQuery(t: ReviewTrade, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  const hay = [t.instanceId != null ? `#${t.instanceId}` : '', t.underlying, t.label, t.play ?? ''].join(' ').toLowerCase()
  return hay.includes(s)
}

export function outcomeCount(trades: readonly ReviewTrade[], key: PickOutcome): number | null {
  const o = OUTCOMES.find((x) => x.key === key)!
  let n = 0
  for (const t of trades) {
    const r = o.test(t)
    if (r === null) return null
    if (r) n += 1
  }
  return n
}

export function filterTrades(trades: readonly ReviewTrade[], outcome: PickOutcome, q: string): ReviewTrade[] {
  const o = OUTCOMES.find((x) => x.key === outcome)!
  return trades.filter((t) => o.test(t) === true && matchesQuery(t, q))
}

export interface PickGroupRows {
  key: string
  label: string | null
  count: number
  net: number
  rows: ReviewTrade[]
}

function expiryMonth(t: ReviewTrade): { key: string; label: string } {
  const [y, m] = t.expiry.split('-')
  const mi = Number(m) - 1
  if (!y || !(mi >= 0 && mi < 12)) return { key: '0000-00', label: 'no expiry' }
  return { key: `${y}-${m}`, label: `${MON[mi]} ${y}` }
}

/** Groups keep the list's own order inside; Symbol groups by size, Expiry newest month first. */
export function groupTrades(rows: readonly ReviewTrade[], by: PickGroup): PickGroupRows[] {
  if (by === 'none') return [{ key: 'all', label: null, count: rows.length, net: rows.reduce((a, t) => a + t.realised, 0), rows: [...rows] }]
  const map = new Map<string, PickGroupRows>()
  for (const t of rows) {
    const k = by === 'sym' ? { key: t.underlying, label: t.underlying } : expiryMonth(t)
    const g = map.get(k.key) ?? { key: k.key, label: k.label, count: 0, net: 0, rows: [] }
    g.count += 1
    g.net += t.realised
    g.rows.push(t)
    map.set(k.key, g)
  }
  const groups = [...map.values()]
  return by === 'sym'
    ? groups.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    : groups.sort((a, b) => b.key.localeCompare(a.key))
}

/** ‹ › and [ ]: the neighbour in the full list, wrapping. */
export function stepTrade(trades: readonly ReviewTrade[], current: string | null, d: 1 | -1): ReviewTrade | null {
  if (trades.length === 0) return null
  const i = Math.max(0, trades.findIndex((t) => t.contractKey === current))
  return trades[(i + d + trades.length) % trades.length]
}
