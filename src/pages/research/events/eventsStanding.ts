/**
 * What the event board can honestly say about itself, in one reading.
 *
 * The design's four states (Package 2026-09-23.4), and the reason they are
 * one reading rather than four panels each with its own empty state: the four
 * stores are **one pipeline**. Asked separately, an unfed board draws three
 * empty shells that each imply the market was quiet — which is a claim about
 * the market made by a page that has never been fed.
 *
 * ```
 * failed   any store did not answer      → say so; never render as empty
 * unfed    batches has no rows at all    → the ingest has never run
 * empty    batches exist, window is 0    → a reading about the market
 * live     events in the window          → the three panels
 * ```
 *
 * Measured on DEV 2026-09-23: all four answer `200` with `0` rows, and
 * `events/batches` is `count: 0` — so this side renders `unfed`, which is the
 * state the design added precisely so the page need not wait for the plumbing.
 */

export type EventsState = 'live' | 'unfed' | 'empty' | 'failed'

export interface StoreReading {
  /** The route, as the reader would check it. */
  path: string
  label: string
  isError: boolean
  isLoading: boolean
  rows: number | null
}

export interface EventsStanding {
  state: EventsState
  title: string
  detail: string
  /** True while any store is still answering — do not judge yet. */
  loading: boolean
  stores: readonly StoreReading[]
}

export function eventsStanding(
  stores: readonly StoreReading[],
  opts: { batchesPath: string; lastBatchAt?: string | null; windowDays?: number } = {
    batchesPath: '/research/events/batches',
  },
): EventsStanding {
  const loading = stores.some((s) => s.isLoading)
  const failed = stores.filter((s) => s.isError)
  const batches = stores.find((s) => s.path === opts.batchesPath)
  const windowDays = opts.windowDays ?? 30

  if (failed.length > 0) {
    return {
      state: 'failed',
      title: 'Event radar did not answer',
      detail: `${failed.length} of ${stores.length} stores returned an error. This is not an empty board — nothing here has been read, so nothing here can be called quiet.`,
      loading,
      stores,
    }
  }
  if (loading) {
    return { state: 'live', title: '', detail: '', loading, stores }
  }
  if (batches && (batches.rows ?? 0) === 0) {
    return {
      state: 'unfed',
      title: 'Pipeline not connected',
      detail:
        'Nothing has been ingested yet — the event radar has never processed a batch. This is a fact about the ingest, not about the market: a quiet market still produces batches.',
      loading,
      stores,
    }
  }
  const events = stores.find((s) => s.path !== opts.batchesPath && s.rows != null)
  if (!stores.some((s) => s.path !== opts.batchesPath && (s.rows ?? 0) > 0)) {
    return {
      state: 'empty',
      title: 'Quiet window',
      detail: opts.lastBatchAt
        ? `No events in the last ${windowDays} days. The last batch landed ${opts.lastBatchAt}, so the pipeline is running — this is a reading about the market.`
        : `No events in the last ${windowDays} days, and the pipeline has run. This is a reading about the market, not a fault.`,
      loading,
      stores,
    }
  }
  void events
  return { state: 'live', title: '', detail: '', loading, stores }
}
