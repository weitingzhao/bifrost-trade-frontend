import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  GateSafetyFormSheet,
  type GateSheetMode,
} from '@/components/strategy/gates/GateSafetyFormSheet'
import { GatesTable } from '@/components/strategy/gates/GatesTable'
import {
  gatesActiveGridClass,
  gatesActiveHintClass,
  gatesActiveIdClass,
  gatesActiveLabelClass,
  gatesActiveValueClass,
  gatesCountMetaClass,
  gatesEmptyHintClass,
  gatesSectionTitleClass,
  gatesToolbarActionsClass,
  gatesToolbarClass,
} from '@/components/strategy/gates/gatesUi'
import { useGateSafetyList, useSetActiveStrategy } from '@/hooks/useGateSafety'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import type { GateSafetyItem } from '@/types/positions'

const GATES_INFO =
  'Create and edit gate safety boundary sets; set which set is active for the daemon.'

export default function GatesPage() {
  const { data: listData, isLoading: listLoading, isError: listError, error: listErr, refetch } =
    useGateSafetyList()
  const { data: statusData } = useMonitorStatus()
  const setActiveMut = useSetActiveStrategy()

  const [sheetMode, setSheetMode] = useState<GateSheetMode>({ kind: 'closed' })
  const [statusMsg, setStatusMsg] = useState<{ text: string; isErr: boolean } | null>(null)

  const items = useMemo(() => listData?.items ?? [], [listData])

  const activeGate = statusData?.strategy?.active?.gate_safety
  const activeAlloc = statusData?.strategy?.active?.allocation
  const activeStructure = statusData?.strategy?.active?.structure

  function flashStatus(text: string, isErr = false) {
    setStatusMsg({ text, isErr })
    window.setTimeout(() => setStatusMsg(null), 5000)
  }

  function openCreate() {
    setSheetMode({ kind: 'create' })
  }

  function openEdit(id: number) {
    setSheetMode({ kind: 'edit', id })
  }

  function openCopy(id: number) {
    setSheetMode({ kind: 'copy', id })
  }

  function closeSheet() {
    setSheetMode({ kind: 'closed' })
  }

  async function handleSetActive(item: GateSafetyItem) {
    try {
      const res = await setActiveMut.mutateAsync({
        active_strategy_structure_id: activeStructure?.id ?? null,
        active_gate_safety_strategy_id: item.gate_safety_strategy_id,
        active_strategy_allocation_id: activeAlloc?.id ?? null,
      })
      if (res.ok) {
        flashStatus('Active gate safety set updated. Daemon uses it on next start.')
      } else {
        flashStatus(res.error ?? 'Failed to set active gate safety set', true)
      }
    } catch (e) {
      flashStatus(e instanceof Error ? e.message : String(e), true)
    }
  }

  if (listLoading) {
    return (
      <PageShell padding="default" className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </PageShell>
    )
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1">
            Gates
            <InfoTooltip text={GATES_INFO} />
          </span>
        }
        titleSize="large"
      />

      <Card variant="elevated" size="sm" className="gap-0 p-2.5">
        <h2 className={gatesSectionTitleClass}>Active Strategy Configuration</h2>
        <div className={gatesActiveGridClass}>
          <div>
            <span className={gatesActiveLabelClass}>Gate Safety: </span>
            <span className={gatesActiveValueClass}>
              {activeGate?.name ?? '—'}
              {activeGate?.id != null && (
                <span className={gatesActiveIdClass}>(#{activeGate.id})</span>
              )}
            </span>
          </div>
          <div>
            <span className={gatesActiveLabelClass}>Allocation: </span>
            <span className={gatesActiveValueClass}>
              {activeAlloc?.name ?? '—'}
              {activeAlloc?.id != null && (
                <span className={gatesActiveIdClass}>(#{activeAlloc.id})</span>
              )}
            </span>
          </div>
        </div>
        <p className={gatesActiveHintClass}>Daemon uses this on next start.</p>
      </Card>

      {statusMsg && (
        <Alert variant={statusMsg.isErr ? 'destructive' : 'default'}>
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      <Card variant="elevated" size="sm" className="gap-3 p-2.5">
        <div className={gatesToolbarClass}>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className={gatesSectionTitleClass}>Gate Safety Sets</h2>
            <span className={gatesCountMetaClass}>
              {items.length} {items.length === 1 ? 'set' : 'sets'}
            </span>
          </div>
          <div className={gatesToolbarActionsClass}>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create gate set
            </Button>
          </div>
        </div>

        {listError && <QueryErrorAlert error={listErr} onRetry={() => void refetch()} />}

        {!listError && items.length === 0 && (
          <p className={gatesEmptyHintClass}>No gate safety sets found.</p>
        )}

        {!listError && items.length > 0 && (
          <GatesTable
            items={items}
            activeGateId={activeGate?.id}
            setActivePending={setActiveMut.isPending}
            onEdit={openEdit}
            onCopy={openCopy}
            onSetActive={(item) => void handleSetActive(item)}
          />
        )}
      </Card>

      <GateSafetyFormSheet mode={sheetMode} onClose={closeSheet} />
    </PageShell>
  )
}
