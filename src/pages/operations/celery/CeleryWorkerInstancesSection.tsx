import { useMemo, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { ConfirmDialog } from './ConfirmDialog'
import { CeleryQueueIconButton } from './CeleryQueueIconButton'
import { BubbleSwitch } from '@/components/positions/charts/BubbleSwitch'
import { OpsHostEnvPill } from '@/pages/settings/socket/OpsHostEnvPill'
import type { WorkerProfileInfo, SystemdInstance } from '@/types/ops'
import { formatQueueLabel } from '@/utils/celeryQueueLabels'
import { opsHostEnvFromConfigProfile, socketServicesHostColumnDisplay } from '@/utils/ingestOpsShared'
import { useScaleWorker, useWorkerInstances, useWorkerProfiles, useOpsWorkers } from '@/hooks/useOpsData'
import { useOpsHealth } from '@/hooks/useSocketServices'
import { useCeleryOps } from './useCeleryOps'
import {
  CELERY_WORKER_INSTANCES_COL_WIDTHS,
  celeryActionMsgClass,
  celeryWorkerInstancesFilterBarClass,
  celeryWorkerInstancesTableClass,
} from './celeryUi'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (node.startsWith('worker') && node.length > 'worker'.length) return node.slice('worker'.length)
  return null
}

function profileForUnit(unit: string, profiles: WorkerProfileInfo[]): WorkerProfileInfo | undefined {
  const iid = instanceIdFromUnit(unit)
  if (!iid) return undefined
  const parts = parseCeleryWorkerInstanceId(iid)
  if (parts) {
    const found = profiles.find(p => p.key === parts.profileKey)
    if (found) return found
  }
  return profiles.find(p => p.key === iid)
}

function unitConsumesQueue(unit: string, queue: string, profiles: WorkerProfileInfo[]): boolean {
  const p = profileForUnit(unit, profiles)
  return p?.queues?.includes(queue) ?? false
}

function dedupeProfiles(profiles: WorkerProfileInfo[]): WorkerProfileInfo[] {
  const seen = new Set<string>()
  return profiles.filter(p => { if (seen.has(p.key)) return false; seen.add(p.key); return true })
}

function countInstancesForProfile(instances: SystemdInstance[], profileKey: string): number {
  const seen = new Set<string>()
  let n = 0
  for (const inst of instances) {
    const iid = instanceIdFromUnit(inst.unit)
    if (!iid || seen.has(iid)) continue
    const parts = parseCeleryWorkerInstanceId(iid)
    if (parts?.profileKey !== profileKey) continue
    seen.add(iid); n++
  }
  return n
}

function countWorkerStackByProfile(workers: { worker_id: string; worker_config_profile: string | null }[], profileKey: string) {
  const z = { dev: 0, prod: 0 }
  for (const w of workers) {
    const iid = workerIdToInstanceId(w.worker_id)
    if (!iid) continue
    const parts = parseCeleryWorkerInstanceId(iid)
    if (parts?.profileKey !== profileKey) continue
    const cp = (w.worker_config_profile ?? '').toLowerCase().trim()
    if (cp === 'dev') z.dev++
    else if (cp === 'prod') z.prod++
  }
  return z
}

function profileMaxInstances(p: WorkerProfileInfo): number {
  const raw = p.max_worker_instances
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(1, Math.min(64, Math.floor(raw)))
  return 1
}

const ALL_KEY = '__all__'

function ForceRemoveCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>
        Force kill stuck worker (SIGKILL) if it is still active after graceful stop
      </span>
    </label>
  )
}

// ── Confirm state ─────────────────────────────────────────────────────────────

interface ConfirmState {
  title: string
  message: string
  action: () => Promise<void>
  bodyExtra?: ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface CeleryWorkerInstancesSectionProps {
  queueFilter?: string | null
  onClearQueueFilter?: () => void
}

export function CeleryWorkerInstancesSection({
  queueFilter = null,
  onClearQueueFilter,
}: CeleryWorkerInstancesSectionProps) {
  const { canOperate, token } = useCeleryOps()
  const { data: opsHealth } = useOpsHealth(token)
  const { data: instancesData, isLoading: instancesLoading } = useWorkerInstances()
  const { data: profilesData } = useWorkerProfiles()
  const { data: workersData } = useOpsWorkers()
  const scaleWorker = useScaleWorker()

  const [selectedProfile, setSelectedProfile] = useState<string>(ALL_KEY)
  const [addMaxMode, setAddMaxMode] = useState(true)
  const [scaleMsg, setScaleMsg] = useState<{ text: string; isErr: boolean } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [removeAllForce, setRemoveAllForce] = useState(true)

  const hostColumn = useMemo(
    () => socketServicesHostColumnDisplay({
      configProfile: opsHealth?.config_profile ?? null,
      localControl: opsHealth?.local_control ?? null,
      marketIngestScriptControl: opsHealth?.market_ingest_script_control === true,
    }),
    [opsHealth],
  )
  const opsHostPill = useMemo(
    () => opsHostEnvFromConfigProfile(opsHealth?.config_profile ?? null),
    [opsHealth?.config_profile],
  )

  const instances = useMemo(() => instancesData?.instances ?? [], [instancesData])
  const profiles = useMemo(() => dedupeProfiles(profilesData?.profiles ?? []), [profilesData])
  const workers = workersData?.workers ?? []
  const scaleBusy = scaleWorker.isPending

  const filteredInstances = useMemo(() => {
    const q = queueFilter?.trim()
    if (!q) return instances
    return instances.filter(inst => unitConsumesQueue(inst.unit, q, profiles))
  }, [instances, queueFilter, profiles])

  function scaleRemoveBodyExtra() {
    return (
      <ForceRemoveCheckbox
        checked={removeAllForce}
        onChange={setRemoveAllForce}
      />
    )
  }

  async function doScale(action: () => Promise<void>) {
    try {
      await action()
    } catch (e) {
      setScaleMsg({ text: e instanceof Error ? e.message : 'Scale operation failed', isErr: true })
    }
  }

  async function handleAdd() {
    if (!selectedProfile || selectedProfile === ALL_KEY) return
    const prof = profiles.find(p => p.key === selectedProfile)
    if (!prof) return
    const maxN = profileMaxInstances(prof)
    const cur = countInstancesForProfile(instances, selectedProfile)
    const stack = countWorkerStackByProfile(workers, selectedProfile)

    await doScale(async () => {
      if (!addMaxMode) {
        if (cur >= maxN) {
          setScaleMsg({ text: `Already at configured maximum (${maxN}) for ${selectedProfile}`, isErr: true })
          return
        }
        const r = await scaleWorker.mutateAsync({ action: 'add', worker_type: selectedProfile })
        if (!r.ok) throw new Error(r.error ?? 'Add failed')
        setScaleMsg({ text: `Instance ${r.instance_id ?? r.unit ?? selectedProfile} started`, isErr: false })
      } else {
        const fleet = stack.dev + stack.prod
        const remaining = Math.max(0, maxN - fleet)
        const onHost = Math.max(0, maxN - cur)
        const toStart = Math.min(remaining, onHost)
        if (toStart <= 0) {
          if (fleet >= maxN) {
            setScaleMsg({ text: `No capacity left (Dev+Prod=${fleet} vs max ${maxN}) for ${selectedProfile}`, isErr: true })
          } else {
            setScaleMsg({ text: `Already at max on this host for ${selectedProfile}`, isErr: true })
          }
          return
        }
        const started: string[] = []
        const failed: string[] = []
        for (let i = 0; i < toStart; i++) {
          const r = await scaleWorker.mutateAsync({ action: 'add', worker_type: selectedProfile })
          if (r.ok) started.push(r.instance_id ?? r.unit ?? selectedProfile)
          else failed.push(r.error ?? 'failed')
        }
        const msg = started.length > 0 ? `Started ${started.length}: ${started.join(', ')}` : 'Nothing started'
        setScaleMsg({ text: failed.length > 0 ? `${msg}. Errors: ${failed.join('; ')}` : msg, isErr: failed.length > 0 })
      }
    })
  }

  async function handleAddAll() {
    await doScale(async () => {
      const started: string[] = []
      const failed: string[] = []
      for (const p of profiles) {
        const maxN = profileMaxInstances(p)
        const cur = countInstancesForProfile(instances, p.key)
        const toStart = Math.max(0, maxN - cur)
        for (let i = 0; i < toStart; i++) {
          const r = await scaleWorker.mutateAsync({ action: 'add', worker_type: p.key })
          if (r.ok) started.push(r.instance_id ?? r.unit ?? p.key)
          else failed.push(`${p.key}: ${r.error ?? 'failed'}`)
        }
      }
      const msg = started.length > 0 ? `Started ${started.length}: ${started.join(', ')}` : 'Nothing started'
      setScaleMsg({ text: failed.length > 0 ? `${msg}. Errors: ${failed.join('; ')}` : msg, isErr: failed.length > 0 })
    })
  }

  function handleResetAll() {
    const instIds = instances.map(i => instanceIdFromUnit(i.unit)).filter(Boolean) as string[]
    setConfirm({
      title: 'Reset all worker instances?',
      message: instIds.length > 0
        ? `Force-remove ${instIds.length} unit(s) on this host, then fill to max_worker_instances per profile.${removeAllForce ? ' Force (SIGKILL).' : ''}`
        : 'No units on this host. Will start workers up to max_worker_instances per profile.',
      bodyExtra: scaleRemoveBodyExtra(),
      action: async () => {
        for (const iid of instIds) {
          await scaleWorker.mutateAsync({ action: 'remove', instance_id: iid, force: removeAllForce })
        }
        for (const p of profiles) {
          const maxN = profileMaxInstances(p)
          for (let i = 0; i < maxN; i++) {
            await scaleWorker.mutateAsync({ action: 'add', worker_type: p.key })
          }
        }
        setScaleMsg({ text: 'Reset complete', isErr: false })
      },
    })
  }

  function handleRemoveAll() {
    const instIds = instances.map(i => instanceIdFromUnit(i.unit)).filter(Boolean) as string[]
    if (instIds.length === 0) { setScaleMsg({ text: 'No instances to remove', isErr: true }); return }
    setConfirm({
      title: `Remove all ${instIds.length} worker instance(s)?`,
      message: `Stop every listed worker unit on this host.${removeAllForce ? ' Force (SIGKILL after graceful).' : ''}`,
      bodyExtra: scaleRemoveBodyExtra(),
      action: async () => {
        const removed: string[] = []
        const errors: string[] = []
        for (const iid of instIds) {
          const r = await scaleWorker.mutateAsync({ action: 'remove', instance_id: iid, force: removeAllForce })
          if (r.ok) removed.push(iid)
          else errors.push(`${iid}: ${r.error ?? 'failed'}`)
        }
        setScaleMsg({
          text: `Removed ${removed.length}${errors.length ? `; Errors: ${errors.join(' | ')}` : ''}`,
          isErr: errors.length > 0,
        })
      },
    })
  }

  function handleRecreate(iid: string, workerTypeKey: string) {
    setConfirm({
      title: `Recreate worker ${iid}?`,
      message: `Force-remove this unit, then start a new worker of type ${workerTypeKey}.`,
      action: async () => {
        const r1 = await scaleWorker.mutateAsync({ action: 'remove', instance_id: iid, force: true })
        if (!r1.ok) throw new Error(r1.error ?? 'Remove failed')
        const r2 = await scaleWorker.mutateAsync({ action: 'add', worker_type: workerTypeKey })
        if (!r2.ok) throw new Error(r2.error ?? 'Add failed')
        setScaleMsg({ text: `Recreated ${r2.instance_id ?? workerTypeKey}`, isErr: false })
      },
    })
  }

  function handleRemove(iid: string) {
    setConfirm({
      title: `Remove worker ${iid}?`,
      message: 'Stop this worker unit on this host.',
      bodyExtra: scaleRemoveBodyExtra(),
      action: async () => {
        const r = await scaleWorker.mutateAsync({ action: 'remove', instance_id: iid, force: removeAllForce })
        if (!r.ok) throw new Error(r.error ?? 'Remove failed')
        setScaleMsg({ text: `Removed ${iid}`, isErr: false })
      },
    })
  }

  return (
    <div className="space-y-3">
      {queueFilter && (
        <div className={celeryWorkerInstancesFilterBarClass}>
          <span>Showing instances for queue</span>
          <Badge variant="secondary" className="font-mono text-xs">{formatQueueLabel(queueFilter)}</Badge>
          <code className="text-[10px] text-muted-foreground">{queueFilter}</code>
          {onClearQueueFilter && (
            <Button size="sm" variant="ghost" className="h-6 text-xs ml-auto" onClick={onClearQueueFilter}>
              Show all
            </Button>
          )}
        </div>
      )}

      {scaleMsg && (
        <p className={celeryActionMsgClass(scaleMsg.isErr)} role={scaleMsg.isErr ? 'alert' : 'status'}>
          {scaleMsg.text}
        </p>
      )}

      {instancesLoading ? (
        <p className="text-sm text-muted-foreground">Loading instances…</p>
      ) : instances.length === 0 ? (
        <p className="text-sm text-muted-foreground">No worker instances on this host.</p>
      ) : (
        <DenseDataTable tableClassName={celeryWorkerInstancesTableClass}>
          <colgroup>
            <col style={{ width: CELERY_WORKER_INSTANCES_COL_WIDTHS.host }} />
            <col style={{ width: CELERY_WORKER_INSTANCES_COL_WIDTHS.profile }} />
            <col style={{ width: CELERY_WORKER_INSTANCES_COL_WIDTHS.queue }} />
            <col style={{ width: CELERY_WORKER_INSTANCES_COL_WIDTHS.cycle }} />
            <col style={{ width: CELERY_WORKER_INSTANCES_COL_WIDTHS.action }} />
          </colgroup>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead className="w-16">Host</DenseTableHead>
              <DenseTableHead>Profile</DenseTableHead>
              <DenseTableHead>Queue</DenseTableHead>
              <DenseTableHead align="right" className="w-16">Cycle</DenseTableHead>
              <DenseTableHead className="w-20">Action</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {filteredInstances.length === 0 ? (
              <DenseTableRow>
                <DenseTableCell colSpan={5} className="text-center py-4">
                  <span className={denseTable.emptyHint}>
                    No instances for queue &quot;{queueFilter}&quot;. Clear the filter or start an instance consuming this queue.
                  </span>
                </DenseTableCell>
              </DenseTableRow>
            ) : (
              filteredInstances.map(inst => {
                  const profile = profileForUnit(inst.unit, profiles)
                  const iid = instanceIdFromUnit(inst.unit)
                  const idParts = iid ? parseCeleryWorkerInstanceId(iid) : null
                  const rawQueues = profile?.queues ?? []
                  const queueDisplay = rawQueues.length > 0 ? formatQueueLabel(rawQueues[0]) : '—'
                  const profileKey = idParts?.profileKey ?? profile?.key ?? null
                  const cycle = idParts ? String(idParts.cycle) : '—'
                  const workerTypeKey = idParts?.profileKey ?? profile?.key ?? null

                  return (
                    <DenseTableRow key={inst.unit}>
                      <DenseTableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <OpsHostEnvPill pill={opsHostPill} title={hostColumn.title} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Host chip = Ops API environment (GET /ops/health), not broker queue scope.
                          </TooltipContent>
                        </Tooltip>
                      </DenseTableCell>
                      <DenseTableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <p className="text-xs font-medium">{profile?.label ?? profileKey ?? '—'}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{profileKey ?? inst.unit}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="font-mono text-xs">{inst.unit}</TooltipContent>
                        </Tooltip>
                      </DenseTableCell>
                      <DenseTableCell>
                        <span title={rawQueues.join(', ')}>{queueDisplay}</span>
                        {rawQueues.length > 1 && (
                          <span className={denseTable.mutedMeta}> +{rawQueues.length - 1}</span>
                        )}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>{cycle}</DenseTableCell>
                      <DenseTableCell>
                        <div className="flex gap-1">
                          <CeleryQueueIconButton
                            variant="instance-recreate"
                            title="Recreate (force-remove + add)"
                            aria-label="Recreate worker instance"
                            disabled={scaleBusy || !canOperate || !iid || !workerTypeKey}
                            onClick={() => iid && workerTypeKey && handleRecreate(iid, workerTypeKey)}
                          />
                          <CeleryQueueIconButton
                            variant="instance-remove"
                            title="Remove instance"
                            aria-label="Remove worker instance"
                            disabled={scaleBusy || !canOperate || !iid}
                            onClick={() => iid && handleRemove(iid)}
                          />
                        </div>
                      </DenseTableCell>
                    </DenseTableRow>
                  )
                })
              )}
          </DenseTableBody>
        </DenseDataTable>
      )}

      <div className="space-y-3 pt-1 border-t">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Profile</span>
          <BubbleSwitch
            size="sm"
            value={selectedProfile}
            onChange={setSelectedProfile}
            options={[
              { value: ALL_KEY, label: 'ALL' },
              ...profiles.map(p => ({
                value: p.key,
                label: p.label,
              })),
            ]}
          />
        </div>

        {selectedProfile !== ALL_KEY && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Count</span>
              <BubbleSwitch
                size="sm"
                value={addMaxMode ? 'max' : 'one'}
                onChange={v => setAddMaxMode(v === 'max')}
                options={[
                  { value: 'one', label: '1' },
                  { value: 'max', label: 'Max' },
                ]}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={scaleBusy || !canOperate}
              onClick={() => void handleAdd()}
            >
              <Plus className="h-3 w-3" />
              Add Instance
            </Button>
          </div>
        )}

        {selectedProfile === ALL_KEY && (
          <div className="flex flex-wrap items-center gap-2">
            <CeleryQueueIconButton
              variant="scale-add-all"
              title="Fill all profiles to max_worker_instances on this host"
              aria-label="Add all worker instances"
              disabled={scaleBusy || !canOperate || profiles.length === 0}
              onClick={() => void handleAddAll()}
            />
            <CeleryQueueIconButton
              variant="scale-reset"
              title={instances.length > 0 ? 'Remove all then fill to max per profile' : 'Fill to max per profile'}
              aria-label="Reset all worker instances"
              disabled={scaleBusy || !canOperate || profiles.length === 0}
              onClick={handleResetAll}
            />
            {instances.length > 0 && (
              <CeleryQueueIconButton
                variant="scale-remove-all"
                title="Stop every listed worker unit on this host"
                aria-label="Remove all worker instances"
                disabled={scaleBusy || !canOperate}
                onClick={handleRemoveAll}
              />
            )}
            {instances.length > 0 && (
              <div className="flex items-center gap-2 ml-1">
                <span className="text-xs text-muted-foreground">Force</span>
                <BubbleSwitch
                  size="sm"
                  value={removeAllForce ? 'yes' : 'no'}
                  onChange={v => setRemoveAllForce(v === 'yes')}
                  options={[
                    { value: 'no', label: 'No' },
                    { value: 'yes', label: 'Yes' },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        bodyExtra={confirm?.bodyExtra}
        onConfirm={async () => { await confirm?.action(); setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
