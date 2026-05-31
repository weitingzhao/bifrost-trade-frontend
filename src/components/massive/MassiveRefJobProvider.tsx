import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { postTickerReferenceJob, subscribeMassiveJobEvents, type TickerReferenceJobKind } from '@/api/massive'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import {
  MassiveRefJobSessionContext,
  type MassiveRefJobSessionApi,
  type RefJobTrackItem,
  type TrackedMassiveDbJobKind,
} from '@/components/massive/massiveRefJobContext'

const MAX_TRACKED = 20

function isTerminal(status: string): boolean {
  const s = status.toLowerCase()
  return s === 'done' || s === 'failed'
}

export function MassiveRefJobProvider({ children }: { children: ReactNode }) {
  const [refJobItems, setRefJobItems] = useState<RefJobTrackItem[]>([])
  const [jobsSheetOpen, setJobsSheetOpen] = useState(false)
  const [jobBusyKind, setJobBusyKind] = useState<TrackedMassiveDbJobKind | null>(null)
  const sseClosersRef = useRef<Map<string, () => void>>(new Map())

  useEffect(() => () => {
    sseClosersRef.current.forEach(close => close())
    sseClosersRef.current.clear()
  }, [])

  const startJobStream = useCallback((jid: string) => {
    if (sseClosersRef.current.has(jid)) return
    const sub = subscribeMassiveJobEvents(
      jid,
      data => {
        setRefJobItems(prev =>
          prev.map(row => {
            if (row.jobId !== jid) return row
            if (!data.ok) {
              sseClosersRef.current.delete(jid)
              return { ...row, streamError: data.error ?? 'Job stream error', status: 'failed' }
            }
            const st = (data.job?.status ?? '').trim() || 'running'
            if (isTerminal(st)) sseClosersRef.current.delete(jid)
            return { ...row, status: st, job: data.job, streamError: row.streamError }
          }),
        )
      },
      { timeoutSec: 86400 },
    )
    sseClosersRef.current.set(jid, sub.close)
  }, [])

  const trackMassiveDbJob = useCallback(
    (params: { job_id?: string; deduplicated?: boolean; kind: TrackedMassiveDbJobKind }) => {
      if (!params.job_id) {
        setJobsSheetOpen(true)
        return
      }
      setRefJobItems(prev => {
        const next: RefJobTrackItem[] = [
          {
            jobId: params.job_id!,
            kind: params.kind,
            deduplicated: params.deduplicated,
            status: 'pending',
            enqueuedAt: Date.now(),
          },
          ...prev.filter(r => r.jobId !== params.job_id),
        ].slice(0, MAX_TRACKED)
        return next
      })
      startJobStream(params.job_id)
      setJobsSheetOpen(true)
    },
    [startJobStream],
  )

  const enqueueTickerReferenceJob = useCallback(
    async (
      kind: TickerReferenceJobKind,
      payload: Record<string, unknown>,
      priority?: string,
    ) => {
      setJobBusyKind(kind)
      try {
        const res = await postTickerReferenceJob({ kind, payload, priority })
        if (res.ok && res.job_id) {
          trackMassiveDbJob({ job_id: res.job_id, deduplicated: res.deduplicated, kind })
        }
        return res
      } finally {
        setJobBusyKind(null)
      }
    },
    [trackMassiveDbJob],
  )

  const trackStockOhlcSyncJob = useCallback(
    (res: { job_id?: string; deduplicated?: boolean }) => {
      trackMassiveDbJob({
        job_id: res.job_id,
        deduplicated: res.deduplicated,
        kind: 'feed_stocks_aggregate',
      })
    },
    [trackMassiveDbJob],
  )

  const handleClearCompletedJobs = useCallback(() => {
    setRefJobItems(prev => {
      const removed = prev.filter(r => isTerminal(r.status))
      removed.forEach(r => {
        sseClosersRef.current.get(r.jobId)?.()
        sseClosersRef.current.delete(r.jobId)
      })
      return prev.filter(r => !isTerminal(r.status))
    })
  }, [])

  const activeJobCount = useMemo(
    () => refJobItems.filter(r => !isTerminal(r.status)).length,
    [refJobItems],
  )

  const api = useMemo<MassiveRefJobSessionApi>(
    () => ({
      refJobItems,
      jobsSheetOpen,
      openJobsSheet: () => setJobsSheetOpen(true),
      setJobsSheetOpen,
      activeJobCount,
      jobBusyKind,
      enqueueTickerReferenceJob,
      trackMassiveDbJob,
      trackStockOhlcSyncJob,
      handleClearCompletedJobs,
    }),
    [
      refJobItems,
      jobsSheetOpen,
      activeJobCount,
      jobBusyKind,
      enqueueTickerReferenceJob,
      trackMassiveDbJob,
      trackStockOhlcSyncJob,
      handleClearCompletedJobs,
    ],
  )

  return (
    <MassiveRefJobSessionContext.Provider value={api}>
      {children}
      <Sheet open={jobsSheetOpen} onOpenChange={setJobsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Massive jobs</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {refJobItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracked jobs in this session.</p>
            ) : (
              refJobItems.map(row => (
                <div key={row.jobId} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono truncate">{row.jobId}</code>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {row.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.kind}</p>
                  {row.streamError && (
                    <p className="text-xs text-destructive">{row.streamError}</p>
                  )}
                </div>
              ))
            )}
            {refJobItems.some(r => isTerminal(r.status)) && (
              <Button variant="outline" size="sm" onClick={handleClearCompletedJobs}>
                Clear completed
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MassiveRefJobSessionContext.Provider>
  )
}
