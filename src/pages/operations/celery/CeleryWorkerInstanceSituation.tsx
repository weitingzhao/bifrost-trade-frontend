import { useMemo } from 'react'
import { cn } from '@/lib/utils'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WorkerProfileInfo, WorkerSummary, SystemdInstance } from '@/types/ops'
import {
  CELERY_WORKER_SITUATION_COL_WIDTHS,
  celeryWorkerSituationAtCapNumClass,
  celeryWorkerSituationAtCapRowClass,
  celeryWorkerSituationDevNumClass,
  celeryWorkerSituationProdNumClass,
} from './celeryUi'

function instanceIdFromUnit(unit: string): string | null {
  const m = unit.trim().match(/^bifrost-celery-worker@(.+)\.service$/i)
  return m ? m[1] : null
}

function parseCeleryWorkerInstanceId(id: string): { profileKey: string; cycle: number } | null {
  const m = id.trim().match(/^([a-zA-Z0-9_]+)-(\d+)$/)
  if (!m) return null
  return { profileKey: m[1], cycle: parseInt(m[2], 10) }
}

function workerIdToInstanceId(workerId: string): string | null {
  const node = workerId.split('@')[0]?.trim() ?? ''
  if (node.startsWith('worker') && node.length > 'worker'.length) {
    return node.slice('worker'.length)
  }
  return null
}

function countInstancesForProfile(instances: SystemdInstance[], profileKey: string): number {
  const seen = new Set<string>()
  let n = 0
  for (const inst of instances) {
    const iid = instanceIdFromUnit(inst.unit)
    if (!iid || seen.has(iid)) continue
    const parts = parseCeleryWorkerInstanceId(iid)
    if (parts?.profileKey !== profileKey) continue
    seen.add(iid)
    n++
  }
  return n
}

function countWorkerStackByProfile(
  workers: WorkerSummary[],
  profileKey: string,
): { dev: number; prod: number; unknown: number } {
  const z = { dev: 0, prod: 0, unknown: 0 }
  for (const w of workers) {
    const iid = workerIdToInstanceId(w.worker_id)
    if (!iid) continue
    const parts = parseCeleryWorkerInstanceId(iid)
    if (parts?.profileKey !== profileKey) continue
    const cp = (w.worker_config_profile ?? '').toLowerCase().trim()
    if (cp === 'dev') z.dev++
    else if (cp === 'prod') z.prod++
    else z.unknown++
  }
  return z
}

const PROFILE_MAX_WORKER_INSTANCES_CAP = 64

function profileMaxInstances(p: WorkerProfileInfo): number {
  const raw = p.max_worker_instances
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(1, Math.min(PROFILE_MAX_WORKER_INSTANCES_CAP, Math.floor(raw)))
  }
  return 1
}

function dedupeProfiles(profiles: WorkerProfileInfo[]): WorkerProfileInfo[] {
  const seen = new Set<string>()
  return profiles.filter(p => {
    if (seen.has(p.key)) return false
    seen.add(p.key)
    return true
  })
}

export interface CeleryWorkerInstanceSituationProps {
  profiles: WorkerProfileInfo[]
  instances: SystemdInstance[]
  workers: WorkerSummary[]
  isK8s?: boolean
}

export function CeleryWorkerInstanceSituation({
  profiles,
  instances,
  workers,
  isK8s = false,
}: CeleryWorkerInstanceSituationProps) {
  const deduped = useMemo(() => dedupeProfiles(profiles), [profiles])

  if (deduped.length === 0) {
    return <p className={denseTable.emptyHint}>No profiles</p>
  }

  return (
    <div className="space-y-2">
      <DenseDataTable>
        <colgroup>
          <col style={{ width: CELERY_WORKER_SITUATION_COL_WIDTHS.profile }} />
          <col style={{ width: CELERY_WORKER_SITUATION_COL_WIDTHS.max }} />
          <col style={{ width: CELERY_WORKER_SITUATION_COL_WIDTHS.dev }} />
          <col style={{ width: CELERY_WORKER_SITUATION_COL_WIDTHS.prod }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Profile</DenseTableHead>
            <DenseTableHead
              align="right"
              className="w-20"
              title="Configured maximum worker instances for this profile"
            >
              Max
            </DenseTableHead>
            <DenseTableHead
              align="right"
              className="w-14"
              title="Celery workers reporting dev stack (worker_config_profile from Redis presence)"
            >
              Dev
            </DenseTableHead>
            <DenseTableHead
              align="right"
              className="w-14"
              title="Celery workers reporting prod stack (worker_config_profile from Redis presence)"
            >
              Prod
            </DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {deduped.map(p => {
            const maxN = profileMaxInstances(p)
            const cur = countInstancesForProfile(instances, p.key)
            const stack = countWorkerStackByProfile(workers, p.key)
            const atCap = cur >= maxN
            const tooltipText = atCap
              ? `${isK8s ? 'Kubernetes worker pods' : 'Worker instances'}: ${cur} (at or above configured max ${maxN}). Dev ${stack.dev}, Prod ${stack.prod}${stack.unknown > 0 ? `, Unknown ${stack.unknown}` : ''}.`
              : `${isK8s ? 'Kubernetes worker pods' : 'Worker instances'}: ${cur} / configured max ${maxN}. Dev ${stack.dev}, Prod ${stack.prod}${stack.unknown > 0 ? `, Unknown ${stack.unknown}` : ''}.`

            return (
              <DenseTableRow
                key={p.key}
                className={cn(atCap && celeryWorkerSituationAtCapRowClass)}
              >
                <DenseTableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <p className="text-sm font-medium leading-none">{p.label}</p>
                        <p className={denseTable.mutedMeta}>{p.key}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-60">
                      {tooltipText}
                    </TooltipContent>
                  </Tooltip>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  <span className={cn(atCap && celeryWorkerSituationAtCapNumClass)}>
                    {cur} / {maxN}
                  </span>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  <span className={cn(stack.dev > 0 ? celeryWorkerSituationDevNumClass : denseTable.mutedMeta)}>
                    {stack.dev}
                  </span>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  <span className={cn(stack.prod > 0 ? celeryWorkerSituationProdNumClass : denseTable.mutedMeta)}>
                    {stack.prod}
                  </span>
                </DenseTableCell>
              </DenseTableRow>
            )
          })}
        </DenseTableBody>
      </DenseDataTable>
      <p className={denseTable.mutedMeta}>
        {isK8s
          ? `Kubernetes worker pods observed: ${instances.length} total · Deployment replicas control scale`
          : `Worker instances observed: ${instances.length} total · Limits from config (reload Ops after editing YAML)`}
      </p>
    </div>
  )
}
