import { useMemo } from 'react'
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
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WorkerProfileInfo, WorkerSummary, SystemdInstance } from '@/types/ops'

// ── Parsing helpers (mirror legacy logic) ────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export interface CeleryWorkerInstanceSituationProps {
  profiles: WorkerProfileInfo[]
  instances: SystemdInstance[]
  workers: WorkerSummary[]
}

export function CeleryWorkerInstanceSituation({
  profiles,
  instances,
  workers,
}: CeleryWorkerInstanceSituationProps) {
  const deduped = useMemo(() => dedupeProfiles(profiles), [profiles])

  if (deduped.length === 0) {
    return <p className="text-sm text-muted-foreground">No profiles</p>
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Profile</TableHead>
            <TableHead
              className="text-right w-20"
              title="Target bifrost-celery-worker units on this Ops host (config max_worker_instances)"
            >
              Max
            </TableHead>
            <TableHead
              className="text-right w-14"
              title="Celery workers reporting dev stack (worker_config_profile from Redis presence)"
            >
              Dev
            </TableHead>
            <TableHead
              className="text-right w-14"
              title="Celery workers reporting prod stack (worker_config_profile from Redis presence)"
            >
              Prod
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deduped.map(p => {
            const maxN = profileMaxInstances(p)
            const cur = countInstancesForProfile(instances, p.key)
            const stack = countWorkerStackByProfile(workers, p.key)
            const atCap = cur >= maxN
            const tooltipText = atCap
              ? `Systemd units: ${cur} (at or above max ${maxN}). Dev ${stack.dev}, Prod ${stack.prod}${stack.unknown > 0 ? `, Unknown ${stack.unknown}` : ''}.`
              : `Systemd units: ${cur} / max ${maxN}. Dev ${stack.dev}, Prod ${stack.prod}${stack.unknown > 0 ? `, Unknown ${stack.unknown}` : ''}.`

            return (
              <TableRow
                key={p.key}
                className={atCap ? 'bg-amber-50/50 dark:bg-amber-950/20' : undefined}
              >
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <p className="text-sm font-medium leading-none">{p.label}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{p.key}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-60">
                      {tooltipText}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  <span className={atCap ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                    {cur} / {maxN}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  <span className={stack.dev > 0 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-muted-foreground'}>
                    {stack.dev}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  <span className={stack.prod > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}>
                    {stack.prod}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className="text-[10px] text-muted-foreground px-1">
        Systemd instances on this host: {instances.length} total · Limits from config (reload Ops after editing YAML)
      </p>
    </div>
  )
}
