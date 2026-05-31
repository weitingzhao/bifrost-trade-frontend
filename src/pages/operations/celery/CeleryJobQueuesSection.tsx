import { useCallback, useMemo, useRef, useState } from 'react'
import { dangerOutlineBtnClass } from '@/lib/uiClasses'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from './ConfirmDialog'
import type { WorkerProfileInfo, MassiveJobApiRow, BarsJob } from '@/types/ops'
import {
  BROKER_QUEUE_STOCKS_IB,
  BROKER_QUEUE_OPTIONS_MASSIVE,
  BROKER_QUEUE_OPTIONS_MASSIVE_HIGH,
  BROKER_QUEUE_STOCKS_MASSIVE,
  BROKER_QUEUE_STOCKS_MASSIVE_HIGH,
  formatQueueLabel,
} from '@/utils/celeryQueueLabels'
import {
  useMassiveJobs,
  useBarsJobs,
  useRetryMassiveJob,
  useRetryBarsJob,
  useDeleteAllMassiveJobs,
  useDeleteAllBarsJobs,
  useRetryFailedMassiveJobs,
  useRetryFailedBarsJobs,
  useTrimMassiveJobs,
  useTrimBarsJobs,
} from '@/hooks/useOpsData'

// ── Tab configuration ─────────────────────────────────────────────────────────

interface JobQueueTab {
  id: string
  label: string
  celeryQueue: string
  pipeline: 'stocks_ib' | 'massive_async'
}

const FALLBACK_TABS: JobQueueTab[] = [
  { id: 'stocks_ib', label: formatQueueLabel(BROKER_QUEUE_STOCKS_IB), celeryQueue: BROKER_QUEUE_STOCKS_IB, pipeline: 'stocks_ib' },
  { id: 'options_massive', label: formatQueueLabel(BROKER_QUEUE_OPTIONS_MASSIVE), celeryQueue: BROKER_QUEUE_OPTIONS_MASSIVE, pipeline: 'massive_async' },
  { id: 'options_massive_high', label: formatQueueLabel(BROKER_QUEUE_OPTIONS_MASSIVE_HIGH), celeryQueue: BROKER_QUEUE_OPTIONS_MASSIVE_HIGH, pipeline: 'massive_async' },
  { id: 'stocks_massive', label: formatQueueLabel(BROKER_QUEUE_STOCKS_MASSIVE), celeryQueue: BROKER_QUEUE_STOCKS_MASSIVE, pipeline: 'massive_async' },
  { id: 'stocks_massive_high', label: formatQueueLabel(BROKER_QUEUE_STOCKS_MASSIVE_HIGH), celeryQueue: BROKER_QUEUE_STOCKS_MASSIVE_HIGH, pipeline: 'massive_async' },
]

function tabsFromProfiles(profiles: WorkerProfileInfo[]): JobQueueTab[] {
  const out: JobQueueTab[] = []
  const seenQueues = new Set<string>()
  for (const p of profiles) {
    const qs = (p.queues ?? []).map(q => String(q).trim()).filter(Boolean)
    if (qs.length === 0) continue
    for (const q of qs) {
      if (seenQueues.has(q)) continue
      seenQueues.add(q)
      const id = qs.length > 1 ? `${p.key}__${q}` : p.key
      out.push({
        id,
        label: qs.length > 1 ? `${p.label} (${q})` : p.label,
        celeryQueue: q,
        pipeline: q === 'stocks_ib' ? 'stocks_ib' : 'massive_async',
      })
    }
  }
  return out
}

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'running' | 'done' | 'failed'
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
]

const LIMIT_OPTIONS = [10, 25, 50, 100] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function statusBadge(status: string | undefined) {
  const s = (status || '').toLowerCase()
  if (s === 'done') return <Badge variant="secondary">{status}</Badge>
  if (s === 'failed') return <Badge variant="destructive">{status}</Badge>
  if (s === 'running') return <Badge variant="default">{status}</Badge>
  return <Badge variant="outline">{status ?? '—'}</Badge>
}

function fmtMassiveResult(j: MassiveJobApiRow): string {
  const r = j.result as Record<string, unknown> | undefined
  if (!r || typeof r !== 'object') return '—'
  const err = r.error
  if (typeof err === 'string') return err
  if (r.rows_written != null) return `rows ${String(r.rows_written)}`
  if (r.rows_upserted != null) return `upserted ${String(r.rows_upserted)}`
  if (r.bars_upserted != null) return `bars ${String(r.bars_upserted)}`
  if (r.message != null) return String(r.message)
  return '—'
}

function fmtMassiveResultDetail(j: MassiveJobApiRow): string {
  const r = j.result as Record<string, unknown> | undefined
  const sum = r?.summary as Record<string, unknown> | undefined
  if (!sum) return ''
  const parts: string[] = []
  if (sum.targets_found != null) parts.push(`targets ${String(sum.targets_found)}`)
  if (sum.contracts_ok != null) parts.push(`contracts_ok ${String(sum.contracts_ok)}`)
  if (sum.pct != null) parts.push(`${String(sum.pct)}%`)
  if (sum.processed != null && sum.total_symbols != null) {
    parts.push(`${String(sum.processed)}/${String(sum.total_symbols)}`)
  }
  let out = parts.join(' · ')
  if (out.length > 200) out = `${out.slice(0, 197)}…`
  return out
}

function fmtBarsResult(j: BarsJob): string {
  const r = j.result
  if (!r) return '—'
  if (r.error) return r.error
  if (r.count != null) return `${r.count} bars`
  if (r.message) return r.message
  return '—'
}

// ── Confirm dialog state ──────────────────────────────────────────────────────

interface ConfirmState {
  title: string
  message: string
  confirmLabel?: string
  action: () => Promise<void>
}

// ── Inner tab panels ──────────────────────────────────────────────────────────

interface MassiveJobsPanelProps {
  tab: JobQueueTab
  statusFilter: StatusFilter
  limit: number
  onConfirm: (state: ConfirmState) => void
  onMsg: (text: string, isErr: boolean) => void
}

function MassiveJobsPanel({ tab, statusFilter, limit, onConfirm, onMsg }: MassiveJobsPanelProps) {
  const filter = useMemo(
    () => ({
      limit,
      offset: 0,
      status: statusFilter === 'all' ? undefined : statusFilter,
      celery_queue: tab.celeryQueue,
    }),
    [limit, statusFilter, tab.celeryQueue],
  )

  const { data, isLoading, isError, error } = useMassiveJobs(filter)
  const retryJob = useRetryMassiveJob()
  const deleteAll = useDeleteAllMassiveJobs()
  const retryFailed = useRetryFailedMassiveJobs()
  const trim = useTrimMassiveJobs()
  const [keepLast, setKeepLast] = useState('100')

  const show = (s: StatusFilter) => statusFilter === 'all' || statusFilter === s

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {show('pending') && (
          <Button size="sm" variant="outline" className={cn('h-7 text-xs', dangerOutlineBtnClass)}
            disabled={deleteAll.isPending}
            onClick={() => onConfirm({
              title: `Delete pending jobs (${tab.celeryQueue})`,
              message: 'Permanently delete all pending rows. Cannot be undone.',
              action: async () => {
                const r = await deleteAll.mutateAsync({ status: 'pending', celeryQueue: tab.celeryQueue })
                onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
              },
            })}>
            Del Pending
          </Button>
        )}
        {show('running') && (
          <Button size="sm" variant="outline" className={cn('h-7 text-xs', dangerOutlineBtnClass)}
            disabled={deleteAll.isPending}
            onClick={() => onConfirm({
              title: `Delete running jobs (${tab.celeryQueue})`,
              message: 'Removes PostgreSQL rows only. Worker may still execute.',
              action: async () => {
                const r = await deleteAll.mutateAsync({ status: 'running', celeryQueue: tab.celeryQueue })
                onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
              },
            })}>
            Del Running
          </Button>
        )}
        {show('done') && (
          <Button size="sm" variant="outline" className={cn('h-7 text-xs', dangerOutlineBtnClass)}
            disabled={deleteAll.isPending}
            onClick={() => onConfirm({
              title: `Delete done jobs (${tab.celeryQueue})`,
              message: 'Permanently delete all done rows. Cannot be undone.',
              action: async () => {
                const r = await deleteAll.mutateAsync({ status: 'done', celeryQueue: tab.celeryQueue })
                onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
              },
            })}>
            Del Done
          </Button>
        )}
        {show('failed') && (
          <>
            <Button size="sm" variant="destructive" className="h-7 text-xs"
              disabled={deleteAll.isPending}
              onClick={() => onConfirm({
                title: `Delete failed jobs (${tab.celeryQueue})`,
                message: 'Permanently delete all failed rows. Cannot be undone.',
                action: async () => {
                  const r = await deleteAll.mutateAsync({ status: 'failed', celeryQueue: tab.celeryQueue })
                  onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
                },
              })}>
              Del Failed
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              disabled={retryFailed.isPending}
              onClick={() => onConfirm({
                title: `Retry failed jobs (${tab.celeryQueue})`,
                message: 'Reset up to 500 oldest failed jobs to pending and re-queue Celery.',
                confirmLabel: 'Retry',
                action: async () => {
                  const r = await retryFailed.mutateAsync({ celeryQueue: tab.celeryQueue, limit: 500 })
                  onMsg(
                    `Reset ${r.reset ?? 0}, enqueued ${r.enqueued ?? 0}${r.enqueue_errors?.length ? ' (some enqueue errors)' : ''}.`,
                    Boolean(r.enqueue_errors?.length),
                  )
                },
              })}>
              ↺ Retry Failed
            </Button>
          </>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground">Keep last</span>
          <Input
            type="number"
            className="h-7 w-20 text-xs"
            min={1}
            max={50000}
            value={keepLast}
            onChange={e => setKeepLast(e.target.value)}
          />
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            disabled={trim.isPending}
            onClick={() => {
              const n = parseInt(keepLast, 10)
              if (!Number.isFinite(n) || n < 1) { onMsg('Enter a number between 1 and 50000.', true); return }
              onConfirm({
                title: `Trim jobs (${tab.celeryQueue})`,
                message: `Keep only the newest ${n} rows. Older rows will be deleted.`,
                action: async () => {
                  const r = await trim.mutateAsync({ keep: n, celeryQueue: tab.celeryQueue })
                  onMsg(`Removed ${r.deleted} older job(s); kept ${n} newest.`, !r.ok)
                },
              })
            }}>
            Trim
          </Button>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-32 rounded" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead className="max-w-48">Goal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.jobs.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No jobs match the filter.
                  </TableCell>
                </TableRow>
              ) : (
                data.jobs.map(row => {
                  const primary = fmtMassiveResult(row)
                  const detail = fmtMassiveResultDetail(row)
                  return (
                    <TableRow key={row.job_id}>
                      <TableCell className="font-mono text-[10px]">{row.job_id}</TableCell>
                      <TableCell className="text-xs">{row.kind ?? '—'}</TableCell>
                      <TableCell className="text-xs max-w-48 truncate" title={row.goal ?? undefined}>
                        {row.goal ?? '—'}
                      </TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtTs(row.created_ts)}</TableCell>
                      <TableCell className="text-xs max-w-52" title={detail ? `${primary}\n${detail}` : primary}>
                        <div>{primary}</div>
                        {detail && <div className="text-muted-foreground text-[10px]">{detail}</div>}
                      </TableCell>
                      <TableCell>
                        {(row.status || '').toLowerCase() === 'failed' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            disabled={retryJob.isPending}
                            onClick={() => {
                              void retryJob.mutateAsync(row.job_id).then(r => {
                                onMsg(r.ok ? `Job ${row.job_id} reset to pending.` : (r.error ?? 'Retry failed'), !r.ok)
                              })
                            }}
                          >
                            Retry
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

interface BarsJobsPanelProps {
  statusFilter: StatusFilter
  limit: number
  onConfirm: (state: ConfirmState) => void
  onMsg: (text: string, isErr: boolean) => void
}

function BarsJobsPanel({ statusFilter, limit, onConfirm, onMsg }: BarsJobsPanelProps) {
  const filter = useMemo(
    () => ({
      limit,
      offset: 0,
      status: statusFilter === 'all' ? null : statusFilter,
    }),
    [limit, statusFilter],
  )

  const { data, isLoading, isError, error } = useBarsJobs(filter)
  const retryJob = useRetryBarsJob()
  const deleteAll = useDeleteAllBarsJobs()
  const retryFailed = useRetryFailedBarsJobs()
  const trim = useTrimBarsJobs()
  const [keepLast, setKeepLast] = useState('100')

  const show = (s: StatusFilter) => statusFilter === 'all' || statusFilter === s

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {show('pending') && (
          <Button size="sm" variant="outline" className={cn('h-7 text-xs', dangerOutlineBtnClass)}
            disabled={deleteAll.isPending}
            onClick={() => onConfirm({
              title: 'Delete pending bars jobs',
              message: 'Permanently delete all pending bars backfill rows.',
              action: async () => {
                const r = await deleteAll.mutateAsync({ status: 'pending' })
                onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
              },
            })}>
            Del Pending
          </Button>
        )}
        {show('running') && (
          <Button size="sm" variant="outline" className={cn('h-7 text-xs', dangerOutlineBtnClass)}
            disabled={deleteAll.isPending}
            onClick={() => onConfirm({
              title: 'Delete running bars jobs',
              message: 'Removes PostgreSQL rows only. Worker may still execute.',
              action: async () => {
                const r = await deleteAll.mutateAsync({ status: 'running' })
                onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
              },
            })}>
            Del Running
          </Button>
        )}
        {show('done') && (
          <Button size="sm" variant="outline" className={cn('h-7 text-xs', dangerOutlineBtnClass)}
            disabled={deleteAll.isPending}
            onClick={() => onConfirm({
              title: 'Delete done bars jobs',
              message: 'Permanently delete all done rows.',
              action: async () => {
                const r = await deleteAll.mutateAsync({ status: 'done' })
                onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
              },
            })}>
            Del Done
          </Button>
        )}
        {show('failed') && (
          <>
            <Button size="sm" variant="destructive" className="h-7 text-xs"
              disabled={deleteAll.isPending}
              onClick={() => onConfirm({
                title: 'Delete failed bars jobs',
                message: 'Permanently delete all failed rows.',
                action: async () => {
                  const r = await deleteAll.mutateAsync({ status: 'failed' })
                  onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
                },
              })}>
              Del Failed
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              disabled={retryFailed.isPending}
              onClick={() => onConfirm({
                title: 'Retry failed bars jobs',
                message: 'Reset up to 500 oldest failed jobs to pending and re-queue.',
                confirmLabel: 'Retry',
                action: async () => {
                  const r = await retryFailed.mutateAsync(500)
                  onMsg(
                    `Reset ${r.reset ?? 0}, enqueued ${r.enqueued ?? 0}.`,
                    Boolean(r.enqueue_errors?.length),
                  )
                },
              })}>
              ↺ Retry Failed
            </Button>
          </>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground">Keep last</span>
          <Input
            type="number"
            className="h-7 w-20 text-xs"
            min={1}
            max={50000}
            value={keepLast}
            onChange={e => setKeepLast(e.target.value)}
          />
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            disabled={trim.isPending}
            onClick={() => {
              const n = parseInt(keepLast, 10)
              if (!Number.isFinite(n) || n < 1) { onMsg('Enter a number between 1 and 50000.', true); return }
              onConfirm({
                title: 'Trim bars jobs',
                message: `Keep only the newest ${n} rows by ID.`,
                action: async () => {
                  const r = await trim.mutateAsync(n)
                  onMsg(`Removed ${r.deleted} older job(s); kept ${n} newest.`, !r.ok)
                },
              })
            }}>
            Trim
          </Button>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-32 rounded" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Job ID</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="max-w-40">Result</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.jobs.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No jobs match the filter.
                  </TableCell>
                </TableRow>
              ) : (
                data.jobs.map(row => (
                  <TableRow key={row.job_id}>
                    <TableCell className="font-mono text-[10px]">{row.job_id}</TableCell>
                    <TableCell className="text-xs font-medium">{row.symbol}</TableCell>
                    <TableCell className="text-xs">{row.period}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="text-xs max-w-40 truncate" title={fmtBarsResult(row)}>
                      {fmtBarsResult(row)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtTs(row.updated_ts)}</TableCell>
                    <TableCell>
                      {(row.status || '').toLowerCase() === 'failed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          disabled={retryJob.isPending}
                          onClick={() => {
                            void retryJob.mutateAsync(row.job_id).then(r => {
                              onMsg(r.ok ? `Job ${row.job_id} reset to pending.` : (r.error ?? 'Retry failed'), !r.ok)
                            })
                          }}
                        >
                          Retry
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface CeleryJobQueuesSectionHandle {
  navigateToQueue: (celeryQueue: string) => void
  navigateToQueueWithStatus: (celeryQueue: string, status: StatusFilter) => void
}

export interface CeleryJobQueuesSectionProps {
  profiles?: WorkerProfileInfo[]
  initialQueue?: string | null
  initialStatus?: StatusFilter
}

export function CeleryJobQueuesSection({
  profiles,
  initialQueue = null,
  initialStatus = 'all',
}: CeleryJobQueuesSectionProps) {
  const tabs = useMemo<JobQueueTab[]>(() => {
    if (profiles?.length) {
      const t = tabsFromProfiles(profiles)
      if (t.length > 0) return t
    }
    return FALLBACK_TABS
  }, [profiles])

  const defaultTabId = useMemo(() => {
    if (initialQueue) {
      const found = tabs.find(t => t.celeryQueue === initialQueue)
      if (found) return found.id
    }
    return tabs[0]?.id ?? ''
  }, [tabs, initialQueue])

  const [activeTabId, setActiveTabId] = useState(defaultTabId)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)
  const [limit, setLimit] = useState<number>(25)
  const [confirm, setConfirm] = useState<(ConfirmState & { confirming: boolean }) | null>(null)
  const [actionMsg, setActionMsg] = useState<{ text: string; isErr: boolean } | null>(null)

  // Sync activeTabId when defaultTabId changes (e.g. profiles loaded after mount)
  const prevDefaultRef = useRef(defaultTabId)
  if (prevDefaultRef.current !== defaultTabId) {
    prevDefaultRef.current = defaultTabId
    setActiveTabId(defaultTabId)
  }

  const handleConfirm = useCallback((state: ConfirmState) => {
    setConfirm({ ...state, confirming: false })
    setActionMsg(null)
  }, [])

  const handleMsg = useCallback((text: string, isErr: boolean) => {
    setActionMsg({ text, isErr })
  }, [])

  const runConfirm = async () => {
    if (!confirm) return
    const { action } = confirm
    setConfirm(c => c ? { ...c, confirming: true } : null)
    try {
      await action()
    } catch (e) {
      setActionMsg({ text: e instanceof Error ? e.message : 'Operation failed', isErr: true })
    } finally {
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Status</span>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => setStatusFilter(o.value)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  statusFilter === o.value
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Last</span>
          <div className="flex gap-1">
            {LIMIT_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  limit === n
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actionMsg && (
        <p
          className={`text-xs px-2 py-1 rounded ${actionMsg.isErr ? 'text-destructive bg-destructive/10' : 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950'}`}
          role={actionMsg.isErr ? 'alert' : 'status'}
        >
          {actionMsg.text}
        </p>
      )}

      {/* Queue tabs */}
      <Tabs value={activeTabId} onValueChange={id => { setActiveTabId(id); setActionMsg(null) }}>
        <TabsList className="flex-wrap h-auto gap-1">
          {tabs.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(t => (
          <TabsContent key={t.id} value={t.id} className="mt-3">
            <p className="text-[10px] font-mono text-muted-foreground mb-2">
              Queue: {t.celeryQueue}
            </p>
            {t.pipeline === 'massive_async' ? (
              <MassiveJobsPanel
                tab={t}
                statusFilter={activeTabId === t.id ? statusFilter : 'all'}
                limit={limit}
                onConfirm={handleConfirm}
                onMsg={handleMsg}
              />
            ) : (
              <BarsJobsPanel
                statusFilter={activeTabId === t.id ? statusFilter : 'all'}
                limit={limit}
                onConfirm={handleConfirm}
                onMsg={handleMsg}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        confirming={confirm?.confirming ?? false}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
