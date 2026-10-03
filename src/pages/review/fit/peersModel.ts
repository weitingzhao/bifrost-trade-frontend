/**
 * Trade review · Compared with (design Rev .104, Owner 2026-09-29: "can I
 * compare it with the trades I have already made?").
 *
 * The peer set is closed instances sharing this one's symbol (default), rule
 * or structure — only those opened before it (default) or every closed one —
 * newest first, at most 12. Paths are normalised so a 20-day put and a 90-day
 * call sit on one grid: x = share of the life to expiry, y = P&L as a
 * multiple of the premium taken in (or paid, for a debit). No new store: the
 * set is the review book, the paths the same daily bars the page reads.
 */
import { daysBetween } from '@/lib/isoDate'
import type { MarkPath } from '@/utils/reviewMarkPath'
import { fmtPct0 } from '@/utils/positions'
import type { ReviewedTrade } from '@/utils/reviewedTrades'

export type PeerBy = 'sym' | 'rule' | 'struct'
export type PeerWhen = 'before' | 'all'
export const PEER_CAP = 12

export const PEER_LABEL: Record<PeerBy, string> = { sym: 'Same symbol', rule: 'Same rule', struct: 'Same structure' }

export function peerPool(
  all: readonly ReviewedTrade[],
  self: ReviewedTrade,
  by: PeerBy,
  when: PeerWhen,
  structureOf: (x: ReviewedTrade) => string | null,
): ReviewedTrade[] {
  const key = (x: ReviewedTrade) => (by === 'sym' ? x.underlying : by === 'rule' ? x.play : structureOf(x))
  const mine = key(self)
  if (mine == null || mine === '') return []
  return all
    .filter((x) => x.contractKey !== self.contractKey && !x.open && key(x) === mine)
    .filter((x) => when === 'all' || (x.openedOn != null && self.openedOn != null && x.openedOn < self.openedOn))
    .sort((a, b) => (b.openedOn ?? '').localeCompare(a.openedOn ?? ''))
}

export const perDay = (net: number, daysHeld: number | null) => net / Math.max(1, daysHeld ?? 1)

/** Share of the best mark the exit landed — for a winner that had a positive best. */
export function landed(net: number, path: MarkPath | null): number | null {
  if (!path || path.best <= 0 || net < 0) return null
  return Math.min(1, net / path.best)
}

export function median(values: readonly (number | null)[]): number | null {
  const v = values.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b)
  if (v.length === 0) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

/** The normalised line: x in [0, 1] of the life to expiry, y in premium multiples. */
export function normalised(x: ReviewedTrade, path: MarkPath | null): { x: number; y: number }[] {
  if (!path || !x.openedOn || !x.entryPremium) return []
  const life = Math.max(1, x.dteAtEntry ?? path.held.length)
  return path.held.map((p) => ({ x: Math.min(1, Math.max(0, (daysBetween(x.openedOn!, p.date) ?? 0) / life)), y: p.pl / x.entryPremium }))
}

export function peerReading(input: {
  selfLabel: string
  selfOpen: boolean
  selfPerDay: number
  selfLanded: number | null
  peerPerDays: readonly number[]
  peerLandeds: readonly (number | null)[]
  fmtMoney: (v: number) => string
}): string {
  const { peerPerDays } = input
  if (peerPerDays.length === 0) return ''
  const mPd = median(peerPerDays)!
  const rank = peerPerDays.filter((v) => v > input.selfPerDay).length + 1
  const mLd = median(input.peerLandeds)
  let s = `${input.selfLabel} makes ${input.fmtMoney(input.selfPerDay)} a day against a peer median of ${input.fmtMoney(mPd)} — ${
    rank === 1 ? 'the best of' : `number ${rank} of`
  } ${peerPerDays.length + 1}. `
  if (mLd != null && input.selfLanded != null) s += `It landed ${fmtPct0(input.selfLanded)} of its best mark; peers landed ${fmtPct0(mLd)}. `
  if (input.selfOpen) s += 'Provisional: this one is still open, the peers are settled.'
  else if (input.selfLanded != null && mLd != null && input.selfLanded < mLd - 0.15)
    s += 'The gap is in the exit, not the entry — the same name paid more to those who stayed with it.'
  return s.trim()
}
