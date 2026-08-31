/**
 * No-op stand-in for deleted Massive ref-job session (Wave 7-D).
 * Stock Data Readiness still types against this API; enqueue/track are disabled.
 */

export type TrackedMassiveDbJobKind =
  | 'feed_stocks_tickers_reference_universe'
  | 'feed_stocks_tickers_reference_overview'
  | 'feed_stocks_aggregate'
  | string

export interface MassiveRefJobSessionApi {
  jobBusyKind: TrackedMassiveDbJobKind | null
  activeJobCount: number
  refJobItems: unknown[]
  openJobsSheet: () => void
  enqueueTickerReferenceJob: (
    kind: TrackedMassiveDbJobKind,
    payload?: Record<string, unknown>,
    priority?: 'high' | 'normal' | string,
  ) => Promise<{ ok: boolean; error?: string }>
  trackStockOhlcSyncJob: (args: { job_id: string }) => void
  trackMassiveDbJob: (args: { job_id: string; kind: TrackedMassiveDbJobKind }) => void
}

const DISABLED = 'Massive Trade API removed — use Market Data Plugin'

export function useMassiveRefJobSession(): MassiveRefJobSessionApi {
  return {
    jobBusyKind: null,
    activeJobCount: 0,
    refJobItems: [],
    openJobsSheet: () => undefined,
    enqueueTickerReferenceJob: async () => ({ ok: false, error: DISABLED }),
    trackStockOhlcSyncJob: () => undefined,
    trackMassiveDbJob: () => undefined,
  }
}

export function MassiveRefJobProvider({ children }: { children: React.ReactNode }) {
  return children
}
