/**
 * Twelve readings, from six lenses asked twice.
 *
 * The endpoint takes one lens and one window, so "each signal now against its
 * own year" is 6 × 2 requests. They are independent and cached hard — a decay
 * reading moves when outcomes settle, which is daily at best, so refetching
 * while the reader scrolls buys nothing.
 */
import { useQueries } from '@tanstack/react-query'
import { fetchSignalDecay, SIGNAL_DECAY_LENSES } from '@/api/research/signalDecay'
import { decayAlerts, decayRoster, type LensPair } from './decayRosterModel'

/** The page's own six, from the module that owns the vocabulary. */
export const DECAY_LENSES = SIGNAL_DECAY_LENSES

/** Now, and the signal's own year. The design's baseline is the second one. */
const NOW_DAYS = 90
const YEAR_DAYS = 252

export function useDecayRoster() {
  const queries = useQueries({
    queries: DECAY_LENSES.flatMap((l) =>
      [NOW_DAYS, YEAR_DAYS].map((windowDays) => ({
        queryKey: ['research', 'signal-decay', 'roster', l.value, windowDays],
        queryFn: () => fetchSignalDecay({ lens: l.value, windowDays }),
        staleTime: 30 * 60_000,
        retry: 0,
      })),
    ),
  })

  // Twelve rows out of twelve objects — cheap enough to do every render, and
  // a memo here would have to be keyed on the query array, which is new every
  // render anyway.
  const pairs: LensPair[] = DECAY_LENSES.map((l, i) => ({
    lens: l.value,
    label: l.label,
    now: queries[i * 2]?.data ?? null,
    year: queries[i * 2 + 1]?.data ?? null,
  }))
  const rows = decayRoster(pairs)

  return {
    rows,
    alerts: decayAlerts(rows),
    loading: queries.some((q) => q.isLoading),
    /** Lenses whose reading did not arrive — named rather than shown as zero. */
    failed: DECAY_LENSES.filter((_, i) => queries[i * 2]?.isError).map((l) => l.label),
  }
}
