/**
 * "Closed since" — the window the strategy service takes as an epoch.
 *
 * Shared because two pages ask the same service the same way: Strategy › Win
 * Rate, and Review › Playbook stats, which absorbs it (design DECISIONS
 * 2026-09-18). One definition of what "Q" means keeps the two from disagreeing
 * about the same question while Win Rate is still routed.
 *
 * The boundary is UTC midnight, not "now minus N months": a window that moved
 * with the clock would give a different answer to the same question asked twice
 * in a day, and the service is counting closed instances, not a rolling rate.
 */
export type SinceFilter = '' | '1m' | 'q' | 'half' | '1y' | 'ytd'

export const SINCE_OPTIONS: { key: SinceFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: '1m', label: '1m' },
  { key: 'q', label: 'Q' },
  { key: 'half', label: '6m' },
  { key: '1y', label: '1y' },
  { key: 'ytd', label: 'YTD' },
]

/** Epoch seconds at the window's start, or undefined for all of history. */
export function sinceEpoch(filter: SinceFilter, now: Date = new Date()): number | undefined {
  if (!filter) return undefined
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (filter === '1m') d.setUTCMonth(d.getUTCMonth() - 1)
  else if (filter === 'q') d.setUTCMonth(d.getUTCMonth() - 3)
  else if (filter === 'half') d.setUTCMonth(d.getUTCMonth() - 6)
  else if (filter === '1y') d.setUTCFullYear(d.getUTCFullYear() - 1)
  else if (filter === 'ytd') {
    d.setUTCMonth(0)
    d.setUTCDate(1)
  }
  return Math.floor(d.getTime() / 1000)
}
