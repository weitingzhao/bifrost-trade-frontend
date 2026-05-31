import { createContext, useContext } from 'react'
import type { TickerReferenceJobKind } from '@/api/massive'
import type { MassiveJobApiRow } from '@/types/ops'

export type TrackedMassiveDbJobKind =
  | TickerReferenceJobKind
  | 'feed_stocks_aggregate'
  | 'feed_stocks_income_statements'
  | 'feed_stocks_balance_sheets'
  | 'feed_stocks_cash_flows'
  | 'feed_stocks_ratios'
  | 'feed_stocks_short_interest'
  | 'feed_stocks_short_volume'

export type RefJobTrackItem = {
  jobId: string
  kind: TrackedMassiveDbJobKind
  deduplicated?: boolean
  status: string
  job?: MassiveJobApiRow
  streamError?: string
  enqueuedAt: number
}

export type MassiveRefJobSessionApi = {
  refJobItems: RefJobTrackItem[]
  jobsSheetOpen: boolean
  openJobsSheet: () => void
  setJobsSheetOpen: (open: boolean) => void
  activeJobCount: number
  jobBusyKind: TrackedMassiveDbJobKind | null
  enqueueTickerReferenceJob: (
    kind: TickerReferenceJobKind,
    payload: Record<string, unknown>,
    priority?: string,
  ) => Promise<{ ok: boolean; error?: string; job_id?: string; deduplicated?: boolean }>
  trackMassiveDbJob: (params: {
    job_id?: string
    deduplicated?: boolean
    kind: TrackedMassiveDbJobKind
  }) => void
  trackStockOhlcSyncJob: (res: { job_id?: string; deduplicated?: boolean }) => void
  handleClearCompletedJobs: () => void
}

export const MassiveRefJobSessionContext = createContext<MassiveRefJobSessionApi | null>(null)

export function useMassiveRefJobSession(): MassiveRefJobSessionApi {
  const v = useContext(MassiveRefJobSessionContext)
  if (!v) throw new Error('useMassiveRefJobSession must be used within MassiveRefJobProvider')
  return v
}
