import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { SegmentControl } from '@/components/data-display'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AvailabilityFilter } from '@/components/strategy/AvailabilityFilterPills'
import { StructureFormSheet, type StructureFormMode } from '@/components/strategy/StructureFormSheet'
import { StrategyHistorySection } from '@/components/strategy/StrategyHistorySection'
import { StructuresTable } from '@/components/strategy/StructuresTable'
import {
  structuresActiveGridClass,
  structuresActiveHintClass,
  structuresActiveIdClass,
  structuresActiveLabelClass,
  structuresActiveValueClass,
  structuresEmptyHintClass,
  structuresSectionTitleClass,
  structuresToolbarActionsClass,
  structuresToolbarClass,
  structuresToolbarLabelClass,
} from '@/components/strategy/structures/structuresUi'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import {
  useSetActiveStructureConfig,
  useStructuresAll,
  useUpdateStructure,
} from '@/hooks/useStructureManagement'
import { fetchStructure } from '@/api/strategy'
import type { StrategyStructure } from '@/types/strategy'
import { structureToPayload } from '@/utils/strategyFormUtils'

const STRUCTURE_INFO =
  'View and set active strategy structure and gate safety set; daemon uses these on next start.'

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Available' },
  { value: 'inactive', label: 'Unavailable' },
]

export default function StructuresPage() {
  const { data: statusData } = useMonitorStatus()
  const { data, isLoading, isError, error, refetch } = useStructuresAll()
  const setActiveMut = useSetActiveStructureConfig()
  const updateMut = useUpdateStructure()

  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('active')
  const [structureTypeTab, setStructureTypeTab] = useState('')
  const [formMode, setFormMode] = useState<StructureFormMode>({ kind: 'closed' })
  const [historyStructureFilter, setHistoryStructureFilter] = useState<number | ''>('')
  const [statusMsg, setStatusMsg] = useState<{ text: string; isErr: boolean } | null>(null)
  const [availabilityUpdatingId, setAvailabilityUpdatingId] = useState<number | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const allStructures = useMemo(() => data?.items ?? [], [data])

  const filteredByAvailability = useMemo(() => {
    if (availabilityFilter === 'all') return allStructures
    if (availabilityFilter === 'active') return allStructures.filter((s) => s.is_active)
    return allStructures.filter((s) => !s.is_active)
  }, [allStructures, availabilityFilter])

  const dimStructureTabs = useMemo(
    () =>
      Array.from(
        new Set(allStructures.map((s) => s.dim_structure || 'other').filter(Boolean)),
      ).sort(),
    [allStructures],
  )

  const structuresForTab = useMemo(() => {
    if (structureTypeTab === '') return filteredByAvailability
    return filteredByAvailability.filter(
      (row) => (row.dim_structure || 'other') === structureTypeTab,
    )
  }, [filteredByAvailability, structureTypeTab])

  const activeStructure = statusData?.strategy?.active?.structure
  const activeGate = statusData?.strategy?.active?.gate_safety
  const activeAlloc = statusData?.strategy?.active?.allocation

  function flashStatus(text: string, isErr = false) {
    setStatusMsg({ text, isErr })
    window.setTimeout(() => setStatusMsg(null), 5000)
  }

  async function handleSetActiveStructure(structureId: number) {
    try {
      const res = await setActiveMut.mutateAsync({
        active_strategy_structure_id: structureId,
        active_gate_safety_strategy_id: activeGate?.id ?? null,
        active_strategy_allocation_id: activeAlloc?.id ?? null,
      })
      if (res.ok) {
        flashStatus('Active structure updated. Daemon uses it on next start.')
      } else {
        flashStatus(res.error ?? 'Failed to set active structure', true)
      }
    } catch (e) {
      flashStatus(e instanceof Error ? e.message : String(e), true)
    }
  }

  async function handleClearActiveStructure() {
    try {
      const res = await setActiveMut.mutateAsync({
        active_strategy_structure_id: null,
        active_gate_safety_strategy_id: activeGate?.id ?? null,
        active_strategy_allocation_id: activeAlloc?.id ?? null,
      })
      if (res.ok) {
        flashStatus('Active structure cleared.')
      } else {
        flashStatus(res.error ?? 'Failed to clear active structure', true)
      }
    } catch (e) {
      flashStatus(e instanceof Error ? e.message : String(e), true)
    }
  }

  async function handleToggleAvailability(row: StrategyStructure) {
    const id = row.strategy_structure_id
    setAvailabilityUpdatingId(id)
    setAvailabilityError(null)
    try {
      const full = await fetchStructure(id)
      const payload = structureToPayload(full)
      await updateMut.mutateAsync({ id, payload: { ...payload, is_active: !row.is_active } })
    } catch (e) {
      setAvailabilityError(e instanceof Error ? e.message : String(e))
    } finally {
      setAvailabilityUpdatingId(null)
    }
  }

  if (isLoading) {
    return (
      <PageShell padding="default" className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </PageShell>
    )
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1">
            Strategy / Structure
            <InfoTooltip text={STRUCTURE_INFO} />
          </span>
        }
        titleSize="large"
      />

      <Card variant="elevated" size="sm" className="gap-0 p-2.5">
        <h2 className={structuresSectionTitleClass}>Current active</h2>
        <div className={structuresActiveGridClass}>
          <div>
            <span className={structuresActiveLabelClass}>Structure: </span>
            <span className={structuresActiveValueClass}>
              {activeStructure?.name ?? '—'}
              {activeStructure?.id != null && (
                <span className={structuresActiveIdClass}>({activeStructure.id})</span>
              )}
            </span>
          </div>
          <div>
            <span className={structuresActiveLabelClass}>Gate safety: </span>
            <span className={structuresActiveValueClass}>
              {activeGate?.name ?? '—'}
              {activeGate?.id != null && (
                <span className={structuresActiveIdClass}>({activeGate.id})</span>
              )}
            </span>
          </div>
          <div>
            <span className={structuresActiveLabelClass}>Allocation: </span>
            <span className={structuresActiveValueClass}>
              {activeAlloc?.name ?? '—'}
              {activeAlloc?.id != null && (
                <span className={structuresActiveIdClass}>({activeAlloc.id})</span>
              )}
            </span>
          </div>
        </div>
        <p className={structuresActiveHintClass}>Daemon uses these on next start.</p>
      </Card>

      {statusMsg && (
        <Alert variant={statusMsg.isErr ? 'destructive' : 'default'}>
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      <Card variant="elevated" size="sm" className="gap-3 p-2.5">
        <div className={structuresToolbarClass}>
          <h2 className={structuresSectionTitleClass}>Structure strategies</h2>
          <div className={structuresToolbarActionsClass}>
            <span className={structuresToolbarLabelClass}>Availability</span>
            <SegmentControl
              size="sm"
              ariaLabel="Filter by availability"
              value={availabilityFilter}
              onChange={(v) => setAvailabilityFilter(v as AvailabilityFilter)}
              options={AVAILABILITY_OPTIONS}
            />
            <Button size="sm" onClick={() => setFormMode({ kind: 'create' })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create structure
            </Button>
          </div>
        </div>

        {dimStructureTabs.length > 0 && (
          <Tabs
            value={structureTypeTab === '' ? 'all' : structureTypeTab}
            onValueChange={(v) => setStructureTypeTab(v === 'all' ? '' : v)}
          >
            <TabsList className="h-9 flex-wrap">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              {dimStructureTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="text-xs capitalize">
                  {tab.replace(/_/g, ' ')}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {isError && <QueryErrorAlert error={error} onRetry={() => void refetch()} />}

        {!isError && allStructures.length === 0 && (
          <p className={structuresEmptyHintClass}>No structure strategies in database.</p>
        )}

        {!isError && allStructures.length > 0 && filteredByAvailability.length === 0 && (
          <p className={structuresEmptyHintClass}>No structures match the current filter.</p>
        )}

        {!isError && structuresForTab.length > 0 && (
          <StructuresTable
            rows={structuresForTab}
            activeStructureId={activeStructure?.id}
            availabilityUpdatingId={availabilityUpdatingId}
            setActivePending={setActiveMut.isPending}
            updatePending={updateMut.isPending}
            onToggleAvailability={(row) => void handleToggleAvailability(row)}
            onSetActive={(id) => void handleSetActiveStructure(id)}
            onClearActive={() => void handleClearActiveStructure()}
            onEdit={(id) => setFormMode({ kind: 'edit', id })}
            onCopy={(id) => setFormMode({ kind: 'copy', id })}
          />
        )}
      </Card>

      <StructureFormSheet
        mode={formMode}
        onClose={() => setFormMode({ kind: 'closed' })}
        onSaved={() => void refetch()}
      />

      <Card variant="elevated" size="sm" className="gap-3 p-2.5">
        <h2 className={structuresSectionTitleClass}>Strategy history</h2>
        <CardContent className="p-0">
          <StrategyHistorySection
            structures={allStructures}
            structureFilter={historyStructureFilter}
            onStructureFilterChange={setHistoryStructureFilter}
          />
        </CardContent>
      </Card>

      <Dialog open={availabilityError != null} onOpenChange={(v) => { if (!v) setAvailabilityError(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cannot change availability</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">{availabilityError}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            The structure was not changed. Fix the issue in Option Category or Edit (e.g. meta) and try again.
          </p>
          <DialogFooter>
            <Button type="button" onClick={() => setAvailabilityError(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
