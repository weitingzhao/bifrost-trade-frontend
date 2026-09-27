/**
 * Earnings on the Flow face's put/call year. The PCR store has gaps (PLTR:
 * 103 sessions in a year), so a print is placed by its date on the line's
 * time axis, not on a stored session — a print inside a gap still shows. A
 * late estimate inside the year is a faint line; the next print, or a late
 * one the year does not reach, is named in the key.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import { foldFilings, rankPathEarnings, type RankPathEarnings } from './rankPathEarnings'

export interface PcrYearEarnings {
  /** Results filings inside the year, oldest first. */
  prints: string[]
  /** Where a late print was expected, when the year reaches it. */
  late: string | null
  pending: RankPathEarnings['pending']
}

export function pcrYearEarnings(
  first: string,
  last: string,
  filings: readonly string[],
  next: ExpectedEarnings | null | undefined
): PcrYearEarnings {
  const prints = foldFilings(filings).filter((d) => d >= first && d <= last)
  const late = next && next.days_away < 0 && next.date >= first && next.date <= last ? next.date : null
  // No sessions: the next print (or a late one) is always the key's.
  const { pending } = rankPathEarnings([], filings, next)
  return { prints, late, pending }
}
