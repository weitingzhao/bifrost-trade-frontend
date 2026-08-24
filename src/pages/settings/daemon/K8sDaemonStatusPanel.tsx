import { StatusLamp } from '@/components/StatusLamp'
import { DenseTag } from '@/components/data-display'
import type { OpsHealthResponse, OpsK8sWorkloadStatus } from '@/api/ops'
import type { IngestLamp } from '@/utils/socketIngestLamp'
import { socketSectionTitleClass } from '@/pages/settings/socket/socketIngestUi'

type WorkloadLamp = Extract<IngestLamp, 'green' | 'yellow' | 'red' | 'gray'>

function workloadLamp(wl: OpsK8sWorkloadStatus | undefined): WorkloadLamp {
  if (!wl) return 'gray'
  const { replicas, ready } = wl
  if (replicas === 0) return 'gray'
  if (ready === 0 && replicas > 0) return 'red'
  if (ready > 0 && ready < replicas) return 'yellow'
  if (ready >= replicas && replicas > 0) return 'green'
  return 'gray'
}

function modeBadgeVariant(mode: string | undefined): 'warning' | 'danger' | 'neutral' {
  const m = (mode ?? '').toLowerCase()
  if (m === 'freeze') return 'danger'
  if (m === 'observe') return 'warning'
  return 'neutral'
}

function WorkloadRow({
  name,
  kind,
  wl,
  hint,
}: {
  name: string
  kind: string
  wl: OpsK8sWorkloadStatus | undefined
  hint?: string
}) {
  const lamp = workloadLamp(wl)
  const replicas = wl?.replicas ?? 0
  const ready = wl?.ready ?? 0
  const kindLabel = (wl?.kind || kind || 'Deployment').replace(/^./, c => c.toUpperCase())
  const scaleZero = replicas === 0
  const mode = wl?.mode

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <StatusLamp lamp={lamp} className="h-2.5 w-2.5 shrink-0" />
      <span className="font-medium">
        {kindLabel} {name}{' '}
        <span className="font-mono tabular-nums text-muted-foreground">
          {ready}/{replicas} ready
        </span>
      </span>
      {scaleZero ? (
        <span className="text-dense-meta text-muted-foreground">scale 0</span>
      ) : null}
      {mode ? (
        <DenseTag variant={modeBadgeVariant(mode)} size="pill" className="uppercase">
          {mode}
        </DenseTag>
      ) : null}
      {hint ? <span className="text-dense-meta text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

export function K8sDaemonStatusPanel({ opsHealth }: { opsHealth: OpsHealthResponse | undefined }) {
  const workloads = opsHealth?.k8s_workloads ?? {}
  const namespace = (opsHealth?.k8s_namespace ?? '').trim()
  const daemon = workloads.daemon
  const accountSync = workloads['account-sync']

  const pairOffline =
    (daemon?.replicas ?? 0) === 0 && (accountSync?.replicas ?? 0) === 0

  return (
    <section aria-labelledby="k8s-daemon-workloads-heading">
      <h2
        id="k8s-daemon-workloads-heading"
        className={`${socketSectionTitleClass} flex flex-wrap items-center gap-2 mb-2`}
      >
        Kubernetes Workloads
        {namespace ? (
          <DenseTag variant="neutral" size="pill" className="font-mono normal-case">
            {namespace}
          </DenseTag>
        ) : null}
        {opsHealth?.k8s_reachable === false ? (
          <DenseTag variant="danger" size="pill">
            unreachable
          </DenseTag>
        ) : null}
      </h2>

      <div className="flex flex-col gap-1.5 mt-2">
        {pairOffline ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusLamp lamp="gray" className="h-2.5 w-2.5 shrink-0" />
            <span className="font-medium">Trading pair offline (D10 freeze)</span>
            <span className="text-dense-meta text-muted-foreground">
              daemon + account-sync scale 0
            </span>
          </div>
        ) : (
          <>
            <WorkloadRow name="daemon" kind="Deployment" wl={daemon} />
            <WorkloadRow
              name="account-sync"
              kind="Deployment"
              wl={accountSync}
              hint="co-scaled with daemon"
            />
          </>
        )}
      </div>
    </section>
  )
}
