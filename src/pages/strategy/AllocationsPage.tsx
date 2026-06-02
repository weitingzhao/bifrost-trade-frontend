import { useMemo, useState } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { SegmentControl } from '@/components/data-display'
import type { AvailabilityFilter } from '@/components/strategy/AvailabilityFilterPills'
import { AllocationFormModal } from '@/components/strategy/AllocationFormModal'
import { AllocationsTable } from '@/components/strategy/AllocationsTable'
import {
  allocationsActiveGridClass,
  allocationsActiveHintClass,
  allocationsActiveIdClass,
  allocationsActiveLabelClass,
  allocationsActiveValueClass,
  allocationsEmptyHintClass,
  allocationsSectionTitleClass,
  allocationsToolbarActionsClass,
  allocationsToolbarClass,
  allocationsToolbarLabelClass,
} from '@/components/strategy/allocations/allocationsUi'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useAllocations, useOpportunities } from '@/hooks/useStrategies'
import { setActiveAllocation, updateAllocation } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StrategyAllocation } from '@/types/positions'

const ALLOCATION_INFO =
  'Combine opportunities into an allocation with optional gate safety and position limits. Daemon uses active allocation on next start.'

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Available' },
  { value: 'inactive', label: 'Unavailable' },
]

export default function AllocationsPage() {
  const qc = useQueryClient()
  const { data: statusData } = useMonitorStatus()
  const { data: allocData, isLoading, isError, error, refetch } = useAllocations()
  const { data: oppsData } = useOpportunities()

  const allAllocations = useMemo(() => allocData?.items ?? [], [allocData])

  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('active')
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ text: string; isErr: boolean } | null>(null)

  const activeStructure = statusData?.strategy?.active?.structure
  const activeGate = statusData?.strategy?.active?.gate_safety
  const activeAlloc = statusData?.strategy?.active?.allocation

  const filteredAllocations = useMemo(() => {
    if (availabilityFilter === 'all') return allAllocations
    if (availabilityFilter === 'active') return allAllocations.filter((a) => a.is_active)
    return allAllocations.filter((a) => !a.is_active)
  }, [allAllocations, availabilityFilter])

  const oppNameMap = useMemo(
    () =>
      Object.fromEntries(
        (oppsData?.items ?? []).map((o) => [o.strategy_opportunity_id, o.name]),
      ),
    [oppsData?.items],
  )

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateAllocation(id, { is_active: isActive }),
    onMutate: ({ id }) => {
      setTogglingId(id)
      setToggleError(null)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.allocations })
    },
    onError: (e) => {
      setToggleError(e instanceof Error ? e.message : String(e))
    },
    onSettled: () => {
      setTogglingId(null)
    },
  })

  const setActiveMut = useMutation({
    mutationFn: (allocationId: number | null) =>
      setActiveAllocation(allocationId, {
        structureId: activeStructure?.id ?? null,
        gateSafetyId: activeGate?.id ?? null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
      flashStatus('Active allocation updated. Daemon uses it on next start.')
    },
    onError: (e) => {
      flashStatus(e instanceof Error ? e.message : String(e), true)
    },
  })

  function flashStatus(text: string, isErr = false) {
    setStatusMsg({ text, isErr })
    window.setTimeout(() => setStatusMsg(null), 5000)
  }

  function handleToggleActive(row: StrategyAllocation, isActive: boolean) {
    toggleActiveMutation.mutate({ id: row.strategy_allocation_id, isActive })
  }

  function handleSetActive(id: number) {
    setActiveMut.mutate(id)
  }

  function handleClearActive() {
    setActiveMut.mutate(null)
  }

  const openCreate = () => {
    setDialogMode('create')
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (id: number) => {
    setDialogMode('edit')
    setEditId(id)
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <PageShell padding="default" className="space-y-3">
        <Skeleton className="h-10 w-56" />
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
            Strategy / Allocations
            <InfoTooltip text={ALLOCATION_INFO} />
          </span>
        }
        titleSize="large"
      />

      <Card variant="elevated" size="sm" className="gap-0 p-2.5">
        <h2 className={allocationsSectionTitleClass}>Current active</h2>
        <div className={allocationsActiveGridClass}>
          <div>
            <span className={allocationsActiveLabelClass}>Structure: </span>
            <span className={allocationsActiveValueClass}>
              {activeStructure?.name ?? '—'}
              {activeStructure?.id != null && (
                <span className={allocationsActiveIdClass}>({activeStructure.id})</span>
              )}
            </span>
          </div>
          <div>
            <span className={allocationsActiveLabelClass}>Gate safety: </span>
            <span className={allocationsActiveValueClass}>
              {activeGate?.name ?? '—'}
              {activeGate?.id != null && (
                <span className={allocationsActiveIdClass}>({activeGate.id})</span>
              )}
            </span>
          </div>
          <div>
            <span className={allocationsActiveLabelClass}>Allocation: </span>
            <span className={allocationsActiveValueClass}>
              {activeAlloc?.name ?? '—'}
              {activeAlloc?.id != null && (
                <span className={allocationsActiveIdClass}>({activeAlloc.id})</span>
              )}
            </span>
          </div>
        </div>
        <p className={allocationsActiveHintClass}>Daemon uses these on next start.</p>
      </Card>

      {(toggleError || statusMsg) && (
        <Alert variant={statusMsg?.isErr || toggleError ? 'destructive' : 'default'}>
          <AlertDescription>{toggleError ?? statusMsg?.text}</AlertDescription>
        </Alert>
      )}

      <Card variant="elevated" size="sm" className="gap-3 p-2.5">
        <div className={allocationsToolbarClass}>
          <h2 className={allocationsSectionTitleClass}>Allocations</h2>
          <div className={allocationsToolbarActionsClass}>
            <span className={allocationsToolbarLabelClass}>Availability</span>
            <SegmentControl
              size="sm"
              ariaLabel="Filter by availability"
              value={availabilityFilter}
              onChange={(v) => setAvailabilityFilter(v as AvailabilityFilter)}
              options={AVAILABILITY_OPTIONS}
            />
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New allocation
            </Button>
          </div>
        </div>

        {isError && <QueryErrorAlert error={error} onRetry={() => void refetch()} />}

        {!isError && allAllocations.length === 0 && (
          <p className={allocationsEmptyHintClass}>No allocations yet.</p>
        )}

        {!isError && allAllocations.length > 0 && filteredAllocations.length === 0 && (
          <p className={allocationsEmptyHintClass}>No allocations match the current filter.</p>
        )}

        {!isError && filteredAllocations.length > 0 && (
          <AllocationsTable
            rows={filteredAllocations}
            oppNameMap={oppNameMap}
            activeAllocationId={activeAlloc?.id}
            togglingId={togglingId}
            setActivePending={setActiveMut.isPending}
            onEdit={openEdit}
            onToggleActive={handleToggleActive}
            onSetActive={handleSetActive}
            onClearActive={handleClearActive}
          />
        )}
      </Card>

      <AllocationFormModal
        mode={dialogMode}
        editId={editId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.allocations })}
      />
    </PageShell>
  )
}
