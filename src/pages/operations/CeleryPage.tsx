import { useRef, useState } from 'react'
import { StatusLamp } from '@/components/StatusLamp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CeleryQueueSummaryTable } from './celery/CeleryQueueSummaryTable'
import { CeleryJobQueuesSection } from './celery/CeleryJobQueuesSection'
import { CeleryBeatScheduleCard } from './celery/CeleryBeatScheduleCard'
import { CeleryWorkerInstanceSituation } from './celery/CeleryWorkerInstanceSituation'
import { CeleryWorkerInstancesSection } from './celery/CeleryWorkerInstancesSection'
import {
  useOpsWorkers,
  useOpsQueuesSummary,
  useAggregatedJobQueuesSummary,
  useWorkerProfiles,
  useWorkerInstances,
  useControlBroker,
  useScaleWorker,
  useDeleteAllMassiveJobs,
  useDeleteAllBarsJobs,
  useRetryFailedMassiveJobs,
  useRetryFailedBarsJobs,
} from '@/hooks/useOpsData'
import { computeCeleryRuntimeLamp, runtimeLampText } from '@/utils/celeryRuntime'
import type { WorkerStatus, AggregatedJobQueueSummaryRow } from '@/types/ops'
import { ConfirmDialog } from './celery/ConfirmDialog'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function workerBadgeVariant(status: WorkerStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'running_healthy') return 'default'
  if (status === 'running_degraded') return 'secondary'
  if (status === 'starting') return 'outline'
  return 'destructive'
}

function workerLamp(status: WorkerStatus): string {
  if (status === 'running_healthy') return 'green'
  if (status === 'running_degraded') return 'yellow'
  return 'red'
}

type StatusFilter = 'all' | 'pending' | 'running' | 'done' | 'failed'

// ── Broker Card ───────────────────────────────────────────────────────────────

function BrokerCard() {
  const { data, isLoading } = useOpsWorkers()
  const controlBroker = useControlBroker()
  const [confirm, setConfirm] = useState<{
    action: () => Promise<void>
    title: string
    message: string
  } | null>(null)

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />
  if (!data) return null

  const { broker } = data

  const brokerBtn = (label: string, action: () => Promise<void>) => (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      disabled={controlBroker.isPending}
      onClick={() =>
        setConfirm({
          action,
          title: `${label} broker`,
          message: `Are you sure you want to ${label.toLowerCase()} the Redis broker?`,
        })
      }
    >
      {label}
    </Button>
  )

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StatusLamp lamp={broker.connected ? 'green' : 'red'} />
            Redis / Broker
            <span className="ml-auto flex gap-1">
              {brokerBtn('Start', () => controlBroker.mutateAsync('start').then(() => {}))}
              {brokerBtn('Restart', () => controlBroker.mutateAsync('restart').then(() => {}))}
              {brokerBtn('Stop', () => controlBroker.mutateAsync('stop').then(() => {}))}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={broker.connected ? 'default' : 'destructive'}>
              {broker.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          {broker.used_memory_human && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Memory</p>
              <p className="font-mono text-sm">{broker.used_memory_human}</p>
            </div>
          )}
          {broker.connected_clients != null && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Clients</p>
              <p className="font-mono text-sm">{broker.connected_clients}</p>
            </div>
          )}
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Workers</p>
            <p className="font-mono text-sm">{data.count}</p>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        onConfirm={async () => {
          await confirm?.action()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

// ── Active Celery Workers Table ───────────────────────────────────────────────

function ActiveWorkersTable() {
  const { data, isLoading, isError, error } = useOpsWorkers()
  const scaleWorker = useScaleWorker()
  const [confirm, setConfirm] = useState<{
    action: () => Promise<void>
    title: string
    message: string
  } | null>(null)

  if (isLoading) return <Skeleton className="h-40 rounded-lg" />
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    )
  if (!data) return null

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Active Celery Workers</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={scaleWorker.isPending}
              onClick={() =>
                setConfirm({
                  title: 'Add worker',
                  message: 'Start a new Celery worker instance?',
                  action: () => scaleWorker.mutateAsync({ action: 'add' }).then(() => {}),
                })
              }
            >
              + Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.workers.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">No workers registered</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Queues</TableHead>
                  <TableHead className="text-right">Concurrency</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.workers.map(w => (
                  <TableRow key={w.worker_id}>
                    <TableCell
                      className="font-mono text-xs max-w-48 truncate"
                      title={w.worker_id}
                    >
                      {w.worker_id}
                      {w.worker_config_profile && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({w.worker_config_profile})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusLamp lamp={workerLamp(w.status)} />
                        <Badge variant={workerBadgeVariant(w.status)} className="text-xs">
                          {w.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {w.queues.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {w.concurrency}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {w.active_tasks}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {w.reserved_tasks}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtTs(w.last_heartbeat)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                        disabled={scaleWorker.isPending}
                        onClick={() =>
                          setConfirm({
                            title: 'Remove worker',
                            message: `Stop and remove worker ${w.worker_id}?`,
                            action: () =>
                              scaleWorker
                                .mutateAsync({ action: 'remove', instance_id: w.worker_id })
                                .then(() => {}),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        onConfirm={async () => {
          await confirm?.action()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

// ── Worker Instance Situation Card ────────────────────────────────────────────

function WorkerInstanceSituationCard() {
  const { data: profilesData } = useWorkerProfiles()
  const { data: instancesData } = useWorkerInstances()
  const { data: workersData } = useOpsWorkers()

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Worker Instance Situation</CardTitle>
      </CardHeader>
      <CardContent>
        <CeleryWorkerInstanceSituation
          profiles={profilesData?.profiles ?? []}
          instances={instancesData?.instances ?? []}
          workers={workersData?.workers ?? []}
        />
      </CardContent>
    </Card>
  )
}

// ── Queue Summary Card ────────────────────────────────────────────────────────

interface QueueSummaryCardProps {
  onNavigateToQueue: (celeryQueue: string, status?: StatusFilter) => void
}

function QueueSummaryCard({ onNavigateToQueue }: QueueSummaryCardProps) {
  const { data: workersData } = useOpsWorkers()
  const {
    data: queuesData,
    isLoading: queuesLoading,
    isError: queuesError,
    error: queuesErr,
  } = useOpsQueuesSummary()
  const { data: aggData, isLoading: aggLoading } = useAggregatedJobQueuesSummary()
  const deleteMassive = useDeleteAllMassiveJobs()
  const deleteBars = useDeleteAllBarsJobs()
  const retryMassive = useRetryFailedMassiveJobs()
  const retryBars = useRetryFailedBarsJobs()
  const [busyQueue, setBusyQueue] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    message: string
    queue: string
    action: () => Promise<void>
  } | null>(null)

  const workers = workersData?.workers ?? []
  const brokerConnected = workersData?.broker.connected
  const queueSummary = queuesData?.queues ?? []
  const aggRows = aggData?.rows ?? []
  const loading = queuesLoading || aggLoading

  const runtimeLamp = computeCeleryRuntimeLamp(brokerConnected ?? false, workers)
  const lampText = runtimeLampText(runtimeLamp)

  async function handleDeletePending(row: AggregatedJobQueueSummaryRow): Promise<void> {
    setConfirm({
      title: `Delete pending — ${row.celery_queue}`,
      message: 'Permanently delete all pending rows in this queue. Cannot be undone.',
      queue: row.celery_queue,
      action: async () => {
        setBusyQueue(row.celery_queue)
        try {
          if (row.pipeline === 'massive_async') {
            await deleteMassive.mutateAsync({ status: 'pending', celeryQueue: row.celery_queue })
          } else {
            await deleteBars.mutateAsync({ status: 'pending' })
          }
        } finally {
          setBusyQueue(null)
        }
      },
    })
  }

  async function handleDeleteRunning(row: AggregatedJobQueueSummaryRow): Promise<void> {
    setConfirm({
      title: `Delete running — ${row.celery_queue}`,
      message: 'Removes PostgreSQL rows only. Worker may still execute. Cannot be undone.',
      queue: row.celery_queue,
      action: async () => {
        setBusyQueue(row.celery_queue)
        try {
          if (row.pipeline === 'massive_async') {
            await deleteMassive.mutateAsync({ status: 'running', celeryQueue: row.celery_queue })
          } else {
            await deleteBars.mutateAsync({ status: 'running' })
          }
        } finally {
          setBusyQueue(null)
        }
      },
    })
  }

  async function handleDeleteDone(row: AggregatedJobQueueSummaryRow): Promise<void> {
    setConfirm({
      title: `Delete done — ${row.celery_queue}`,
      message: 'Permanently delete all done rows. Cannot be undone.',
      queue: row.celery_queue,
      action: async () => {
        setBusyQueue(row.celery_queue)
        try {
          if (row.pipeline === 'massive_async') {
            await deleteMassive.mutateAsync({ status: 'done', celeryQueue: row.celery_queue })
          } else {
            await deleteBars.mutateAsync({ status: 'done' })
          }
        } finally {
          setBusyQueue(null)
        }
      },
    })
  }

  async function handleDeleteFailed(row: AggregatedJobQueueSummaryRow): Promise<void> {
    setConfirm({
      title: `Delete failed — ${row.celery_queue}`,
      message: 'Permanently delete all failed rows. Cannot be undone.',
      queue: row.celery_queue,
      action: async () => {
        setBusyQueue(row.celery_queue)
        try {
          if (row.pipeline === 'massive_async') {
            await deleteMassive.mutateAsync({ status: 'failed', celeryQueue: row.celery_queue })
          } else {
            await deleteBars.mutateAsync({ status: 'failed' })
          }
        } finally {
          setBusyQueue(null)
        }
      },
    })
  }

  async function handleResetFailed(row: AggregatedJobQueueSummaryRow): Promise<void> {
    setConfirm({
      title: `Reset failed — ${row.celery_queue}`,
      message: 'Reset up to 500 oldest failed jobs to pending and re-queue Celery.',
      queue: row.celery_queue,
      action: async () => {
        setBusyQueue(row.celery_queue)
        try {
          if (row.pipeline === 'massive_async') {
            await retryMassive.mutateAsync({ celeryQueue: row.celery_queue, limit: 500 })
          } else {
            await retryBars.mutateAsync(500)
          }
        } finally {
          setBusyQueue(null)
        }
      },
    })
  }

  if (queuesError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(queuesErr as Error).message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <StatusLamp lamp={runtimeLamp} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{lampText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            Queue Summary
            {queuesData?.db_connected === false && (
              <Badge variant="secondary" className="ml-2 text-xs">
                DB unavailable
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CeleryQueueSummaryTable
            queueSummary={queueSummary}
            aggregatedRows={aggRows}
            dbConnected={queuesData?.db_connected ?? null}
            loading={loading}
            workers={workers}
            brokerConnected={brokerConnected}
            runtimeLamp={runtimeLamp}
            runtimeLampText={lampText}
            busyQueue={busyQueue}
            onNavigateToQueue={onNavigateToQueue}
            onDeletePending={handleDeletePending}
            onDeleteRunning={handleDeleteRunning}
            onDeleteDone={handleDeleteDone}
            onDeleteFailed={handleDeleteFailed}
            onResetFailed={handleResetFailed}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        onConfirm={async () => {
          await confirm?.action()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CeleryPage() {
  const [mainTab, setMainTab] = useState('queues_instances')
  const [jobQueueTarget, setJobQueueTarget] = useState<{
    queue: string
    status?: StatusFilter
    seq: number
  } | null>(null)
  const [queueFilter, setQueueFilter] = useState<string | null>(null)
  const jobQueuesSectionRef = useRef<HTMLDivElement>(null)
  const { data: profilesData } = useWorkerProfiles()

  function navigateToQueue(queue: string, status?: StatusFilter) {
    setJobQueueTarget(prev => ({ queue, status, seq: (prev?.seq ?? 0) + 1 }))
    setQueueFilter(queue)
    setMainTab('queues_instances')
    setTimeout(() => {
      jobQueuesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-semibold">Celery</h1>

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="queues_instances">Queues &amp; Instances</TabsTrigger>
            <TabsTrigger value="workers_broker">Workers &amp; Broker</TabsTrigger>
            <TabsTrigger value="beat">Beat Schedule</TabsTrigger>
          </TabsList>

          {/* ── Tab: Queues & Instances ── */}
          <TabsContent value="queues_instances" className="space-y-6 mt-4">
            {/* Queue Summary + Worker Instance Situation — mirroring legacy top section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <QueueSummaryCard onNavigateToQueue={navigateToQueue} />
              <WorkerInstanceSituationCard />
            </div>

            {/* Job Queues list — clicking a queue in Queue Summary scrolls here */}
            <div ref={jobQueuesSectionRef}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Job Queues</CardTitle>
                </CardHeader>
                <CardContent>
                  <CeleryJobQueuesSection
                    key={jobQueueTarget ? `${jobQueueTarget.queue}-${jobQueueTarget.seq}` : 'default'}
                    profiles={profilesData?.profiles}
                    initialQueue={jobQueueTarget?.queue ?? null}
                    initialStatus={jobQueueTarget?.status ?? 'all'}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Systemd worker instances + scale controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Worker Instances</CardTitle>
              </CardHeader>
              <CardContent>
                <CeleryWorkerInstancesSection
                  queueFilter={queueFilter}
                  onClearQueueFilter={() => setQueueFilter(null)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Workers & Broker ── */}
          <TabsContent value="workers_broker" className="space-y-6 mt-4">
            <BrokerCard />
            <ActiveWorkersTable />
          </TabsContent>

          {/* ── Tab: Beat Schedule ── */}
          <TabsContent value="beat" className="mt-4">
            <CeleryBeatScheduleCard />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
