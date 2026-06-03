import { createContext, useContext } from 'react'
import type { TickerReferenceJobKind } from '@/api/massive'
import type {
  MassiveStockRefJobDomain,
  RefJobTrackItem,
  TrackedMassiveDbJobKind,
} from '@/utils/massive/stockReferenceJobHelpers'

export type { RefJobTrackItem, TrackedMassiveDbJobKind, MassiveStockRefJobDomain }

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
    domain?: MassiveStockRefJobDomain
  }) => void
  trackStockOhlcSyncJob: (res: { job_id?: string; deduplicated?: boolean }) => void
  withStockOhlcHttp: <T>(fn: () => Promise<T>) => Promise<T>
  handleClearCompletedJobs: () => void
  handleClearAllJobs: () => void
}

export const MassiveRefJobSessionContext = createContext<MassiveRefJobSessionApi | null>(null)

export function useMassiveRefJobSession(): MassiveRefJobSessionApi {
  const v = useContext(MassiveRefJobSessionContext)
  if (!v) throw new Error('useMassiveRefJobSession must be used within MassiveRefJobProvider')
  return v
}
