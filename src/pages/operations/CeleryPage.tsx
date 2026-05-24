import { useOpsWorkers, useOpsQueuesSummary } from '@/hooks/useOpsData'
import { StatusLamp } from '@/components/StatusLamp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WorkerStatus } from '@/types/ops'

function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function workerBadgeVariant(
  status: WorkerStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
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

export default function CeleryPage() {
  const { data: workersData, isLoading: workersLoading, isError: workersError, error: wErr } = useOpsWorkers()
  const { data: queuesData, isLoading: queuesLoading, isError: queuesError, error: qErr } = useOpsQueuesSummary()

  const isLoading = workersLoading || queuesLoading

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Celery</h1>

      {/* Broker */}
      {workersData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StatusLamp lamp={workersData.broker.connected ? 'green' : 'red'} />
              Broker
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={workersData.broker.connected ? 'default' : 'destructive'}>
                {workersData.broker.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            {workersData.broker.used_memory_human && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Memory</p>
                <p className="font-mono text-sm">{workersData.broker.used_memory_human}</p>
              </div>
            )}
            {workersData.broker.connected_clients != null && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="font-mono text-sm">{workersData.broker.connected_clients}</p>
              </div>
            )}
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Workers</p>
              <p className="font-mono text-sm">{workersData.count}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workers */}
      {workersError ? (
        <Alert variant="destructive">
          <AlertDescription>{(wErr as Error).message}</AlertDescription>
        </Alert>
      ) : workersData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Workers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {workersData.workers.length === 0 ? (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workersData.workers.map((w) => (
                    <TableRow key={w.worker_id}>
                      <TableCell className="font-mono text-xs max-w-48 truncate">{w.worker_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusLamp lamp={workerLamp(w.status)} />
                          <Badge variant={workerBadgeVariant(w.status)} className="text-xs">
                            {w.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {w.queues.join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{w.concurrency}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{w.active_tasks}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{w.reserved_tasks}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtTs(w.last_heartbeat)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Queues */}
      {queuesError ? (
        <Alert variant="destructive">
          <AlertDescription>{(qErr as Error).message}</AlertDescription>
        </Alert>
      ) : queuesData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Queues</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {queuesData.rows.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">No queues found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Running</TableHead>
                    <TableHead className="text-right">Done</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queuesData.rows.map((row) => (
                    <TableRow key={row.profile_key}>
                      <TableCell>
                        <div>
                          <p className="text-sm">{row.label}</p>
                          <p className="text-xs font-mono text-muted-foreground">{row.celery_queue}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.pipeline}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.counts.pending > 0 ? (
                          <Badge variant="secondary">{row.counts.pending}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.counts.running > 0 ? (
                          <Badge variant="default">{row.counts.running}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {row.counts.done}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.counts.failed > 0 ? (
                          <Badge variant="destructive">{row.counts.failed}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
