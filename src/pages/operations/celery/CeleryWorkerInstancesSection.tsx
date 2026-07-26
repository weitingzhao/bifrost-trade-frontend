import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { useWorkerInstances } from '@/hooks/useOpsData'
import { formatQueueLabel } from '@/utils/celeryQueueLabels'
import {
  celeryWorkerInstancesFilterBarClass,
  celeryWorkerInstancesTableClass,
} from './celeryUi'

// ── Component ─────────────────────────────────────────────────────────────────

export interface CeleryWorkerInstancesSectionProps {
  queueFilter?: string | null
  onClearQueueFilter?: () => void
}

export function CeleryWorkerInstancesSection({
  queueFilter = null,
  onClearQueueFilter,
}: CeleryWorkerInstancesSectionProps) {
  const { data: instancesData, isLoading: instancesLoading } = useWorkerInstances()
  const instances = useMemo(() => instancesData?.instances ?? [], [instancesData])

  return (
    <div className="space-y-3">
      {queueFilter && (
        <div className={celeryWorkerInstancesFilterBarClass}>
          <span>Showing instances for queue</span>
          <Badge variant="secondary" className="font-mono text-xs">{formatQueueLabel(queueFilter)}</Badge>
          <code className="text-dense-caption text-muted-foreground">{queueFilter}</code>
          {onClearQueueFilter && (
            <Button size="sm" variant="ghost" className="h-6 text-xs ml-auto" onClick={onClearQueueFilter}>
              Show all
            </Button>
          )}
        </div>
      )}

      <p className="text-dense-meta text-muted-foreground">
        Kubernetes manages Celery workers through Deployments. Scale Deployment replicas in
        the cluster; systemd instance controls are unavailable.
      </p>

      {instancesLoading ? (
        <p className="text-sm text-muted-foreground">Loading Kubernetes workloads…</p>
      ) : instances.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Celery worker pods reported by Kubernetes.</p>
      ) : (
        <DenseDataTable tableClassName={celeryWorkerInstancesTableClass}>
          <colgroup>
            <col style={{ width: 'auto' }} />
            <col style={{ width: '7rem' }} />
            <col style={{ width: '8rem' }} />
          </colgroup>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Workload</DenseTableHead>
              <DenseTableHead>Status</DenseTableHead>
              <DenseTableHead align="right">Replicas ready</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {instances.map(inst => {
              const workload = inst.deployment ?? inst.description ?? inst.unit
              const replicaStatus =
                typeof inst.replicas === 'number' && typeof inst.ready_replicas === 'number'
                  ? `${inst.ready_replicas} / ${inst.replicas}`
                  : '—'

              return (
                <DenseTableRow key={inst.unit}>
                  <DenseTableCell>
                    <div>
                      <p className="text-xs font-medium">{workload}</p>
                      <p className="text-dense-caption font-mono text-muted-foreground">{inst.unit}</p>
                    </div>
                  </DenseTableCell>
                  <DenseTableCell className={denseTable.mutedMeta}>{inst.active}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{replicaStatus}</DenseTableCell>
                </DenseTableRow>
              )
            })}
          </DenseTableBody>
        </DenseDataTable>
      )}
    </div>
  )
}
