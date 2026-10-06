/**
 * Stock screen's earnings (TD-158): the Earn column and the Catalyst stage's
 * three earnings chips read Research's estimate of each name's next print —
 * last year's same-quarter results 8-K plus 52 weeks — served for the whole
 * universe by `/research/narrative/earnings/batch` (`useNamesEarnings`). The
 * vendor's confirmed calendar is not in the subscription, so every date here
 * is an estimate and says so.
 *
 * A name without an estimate (an ETF files no 8-K, a recent listing has fewer
 * than four results releases) holds none of the three chips: the screen cannot
 * vouch that its print is clear of a window, so "Earnings > 10d" does not
 * pass it either.
 */
import type { EarningsReading } from '@/utils/earningsReading'

export const EARN_WINDOWS = {
  earn_lt_10d: (days: number) => days < 10,
  earn_10_30d: (days: number) => days >= 10 && days <= 30,
  earn_gt_10d: (days: number) => days > 10,
} as const

export type EarnChipId = keyof typeof EARN_WINDOWS

export const EARN_CHIP_TITLE: Record<EarnChipId, string> = {
  earn_lt_10d: 'Estimated print inside 10 days, or late with no results 8-K yet. Names without an estimate fail.',
  earn_10_30d: 'Estimated print 10 to 30 days out. Names without an estimate fail.',
  earn_gt_10d: 'Estimated print more than 10 days out. Names without an estimate fail: the screen cannot vouch for a print it cannot date.',
}

/** Each earnings chip → the names whose estimated print falls in its window. */
export function earningsWindowSets(readings: Readonly<Record<string, EarningsReading>>): Map<EarnChipId, Set<string>> {
  const out = new Map<EarnChipId, Set<string>>()
  for (const id of Object.keys(EARN_WINDOWS) as EarnChipId[]) out.set(id, new Set())
  for (const [sym, r] of Object.entries(readings)) {
    if (r.kind !== 'expected') continue
    for (const id of Object.keys(EARN_WINDOWS) as EarnChipId[]) {
      if (EARN_WINDOWS[id](r.next.daysAway)) out.get(id)!.add(sym)
    }
  }
  return out
}

/** The Earn cell: days to the estimated print, or a dash with the reason. */
export function earnCell(r: EarningsReading | undefined): { text: string; title: string; muted: boolean } {
  if (!r) return { text: '…', title: 'Reading Research’s earnings estimate.', muted: true }
  if (r.kind === 'none') return { text: '—', title: `No estimate: ${r.absence.text}.`, muted: true }
  const { daysAway, date, track } = r.next
  const record =
    track.n > 0 && track.medianMissDays != null
      ? ` The rule has missed this name’s prints by a median ${track.medianMissDays} d over ${track.n}.`
      : ''
  return {
    text: daysAway < 0 ? `${-daysAway}d late` : `${daysAway}d`,
    title: `Estimated ${date} — last year’s same-quarter results 8-K plus 52 weeks; confirmed dates are not in the subscription.${record}`,
    muted: false,
  }
}
