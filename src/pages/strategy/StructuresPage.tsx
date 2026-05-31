import { useMemo, useState } from 'react'
import { Copy, Pencil, Plus } from 'lucide-react'
import { PageHeader, PageSection, PageShell } from '@/components/layout'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AvailabilityFilterPills, type AvailabilityFilter } from '@/components/strategy/AvailabilityFilterPills'
import { StructureFormSheet, type StructureFormMode } from '@/components/strategy/StructureFormSheet'
import { StrategyHistorySection } from '@/components/strategy/StrategyHistorySection'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import {
  useSetActiveStructureConfig,
  useStructuresAll,
  useUpdateStructure,
} from '@/hooks/useStructureManagement'
import { fetchStructure } from '@/api/strategy'
import type { StrategyStructure } from '@/types/strategy'
import {
  getStructureDisplayLabel,
  structureToPayload,
  summarizeConstraints,
  summarizeDimensions,
  summarizeLegs,
} from '@/utils/strategyFormUtils'

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
      <PageShell className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-0">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <PageHeader
            title="Structure"
            description="View and set active strategy structure and gate safety set; daemon uses these on next start."
            breadcrumb={
              <p className="text-xs text-muted-foreground">
                Strategy / Structure
                <InfoTooltip text="View and set active strategy structure and gate safety set; daemon uses these on next start." />
              </p>
            }
          />
        </CardHeader>

        <CardContent className="space-y-0 pb-6">
          <PageSection first title="Current active">
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              <div>
                <span className="text-muted-foreground">Structure: </span>
                <span className="font-medium">
                  {activeStructure?.name ?? '—'}
                  {activeStructure?.id != null && (
                    <span className="text-muted-foreground font-mono text-xs ml-1">
                      ({activeStructure.id})
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Gate safety: </span>
                <span className="font-medium">
                  {activeGate?.name ?? '—'}
                  {activeGate?.id != null && (
                    <span className="text-muted-foreground font-mono text-xs ml-1">
                      ({activeGate.id})
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Allocation: </span>
                <span className="font-medium">
                  {activeAlloc?.name ?? '—'}
                  {activeAlloc?.id != null && (
                    <span className="text-muted-foreground font-mono text-xs ml-1">
                      ({activeAlloc.id})
                    </span>
                  )}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Daemon uses these on next start.</p>
          </PageSection>

          {statusMsg && (
            <Alert variant={statusMsg.isErr ? 'destructive' : 'default'} className="mt-4">
              <AlertDescription>{statusMsg.text}</AlertDescription>
            </Alert>
          )}

          <PageSection title="Structure strategies">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div />
              <div className="flex flex-wrap items-center gap-3">
                <AvailabilityFilterPills
                  value={availabilityFilter}
                  onChange={setAvailabilityFilter}
                />
                <Button size="sm" onClick={() => setFormMode({ kind: 'create' })}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create structure
                </Button>
              </div>
            </div>

            {dimStructureTabs.length > 0 && (
              <Tabs
                value={structureTypeTab === '' ? 'all' : structureTypeTab}
                onValueChange={(v) => setStructureTypeTab(v === 'all' ? '' : v)}
                className="mb-4"
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

            {isError && (
              <QueryErrorAlert error={error} onRetry={() => void refetch()} className="mb-4" />
            )}

            {!isError && allStructures.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No structure strategies in database.</p>
            )}

            {!isError && allStructures.length > 0 && filteredByAvailability.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No structures match the current filter.</p>
            )}

            {!isError && structuresForTab.length > 0 && (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Legs</TableHead>
                      <TableHead>Constraints</TableHead>
                      <TableHead className="w-24 text-center">Available</TableHead>
                      <TableHead className="w-24 text-center">
                        <span className="inline-flex items-center justify-center gap-1">
                          In use
                          <InfoTooltip text="Structure selected for the daemon. Only one can be in use." />
                        </span>
                      </TableHead>
                      <TableHead className="w-[140px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structuresForTab.map((row) => {
                      const isCurrentActive =
                        activeStructure?.id === row.strategy_structure_id
                      const availabilityUpdating =
                        availabilityUpdatingId === row.strategy_structure_id
                      return (
                        <TableRow
                          key={row.strategy_structure_id}
                          className={cn(!row.is_active && 'opacity-70')}
                        >
                          <TableCell className="font-medium">
                            {row.name}
                            {row.version != null && (
                              <span
                                className="text-muted-foreground font-mono text-xs ml-1.5"
                                aria-label={`Version ${row.version}`}
                              >
                                v{row.version}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getStructureDisplayLabel(row)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                            {summarizeDimensions(row)}
                          </TableCell>
                          <TableCell
                            className="text-xs text-muted-foreground max-w-[220px] truncate"
                            title={summarizeLegs(row.legs)}
                          >
                            {summarizeLegs(row.legs)}
                          </TableCell>
                          <TableCell
                            className="text-xs text-muted-foreground max-w-[160px] truncate"
                            title={summarizeConstraints(row.constraints)}
                          >
                            {summarizeConstraints(row.constraints)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={row.is_active}
                              disabled={availabilityUpdating || updateMut.isPending}
                              onCheckedChange={() => void handleToggleAvailability(row)}
                              aria-label={`Mark "${row.name}" as ${row.is_active ? 'unavailable' : 'available'}`}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={isCurrentActive}
                              disabled={setActiveMut.isPending}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  void handleSetActiveStructure(row.strategy_structure_id)
                                } else {
                                  void handleClearActiveStructure()
                                }
                              }}
                              aria-label={`Use "${row.name}" as structure in use by daemon`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setFormMode({ kind: 'edit', id: row.strategy_structure_id })}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setFormMode({ kind: 'copy', id: row.strategy_structure_id })}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </PageSection>

          <PageSection title="Strategy history">
            <StrategyHistorySection
              structures={allStructures}
              structureFilter={historyStructureFilter}
              onStructureFilterChange={setHistoryStructureFilter}
            />
          </PageSection>
        </CardContent>
      </Card>

      <StructureFormSheet
        mode={formMode}
        onClose={() => setFormMode({ kind: 'closed' })}
        onSaved={() => void refetch()}
      />

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
