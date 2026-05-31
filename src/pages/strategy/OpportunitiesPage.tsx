import { useState, useMemo } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { AvailabilityFilterPills, type AvailabilityFilter } from '@/components/strategy/AvailabilityFilterPills'
import { useOpportunities } from '@/hooks/useStrategies'
import { putOpportunity, fetchOpportunityDetail } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { OpportunityFormModal } from '@/components/strategy/OpportunityFormModal'
import { getScopeDisplay, opportunityDetailToPayload } from '@/utils/strategyFormUtils'
import type { StrategyOpportunity, EntryCondition } from '@/types/positions'

interface PrefillData {
  name: string
  structureId: string
  gateSafetyId: string
  scopeType: string
  symbols: string[]
  conditions: EntryCondition[]
}

const TABLE_HEAD_CLASS = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'

export default function OpportunitiesPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useOpportunities()
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<AvailabilityFilter>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StrategyOpportunity | undefined>(undefined)
  const [prefillData, setPrefillData] = useState<PrefillData | undefined>(undefined)
  const [copyLoadingId, setCopyLoadingId] = useState<number | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const allItems = useMemo(() => data?.items ?? [], [data])

  const items = useMemo(() => {
    if (filter === 'active') return allItems.filter((o) => o.is_active)
    if (filter === 'inactive') return allItems.filter((o) => !o.is_active)
    return allItems
  }, [allItems, filter])

  async function handleToggle(opp: StrategyOpportunity) {
    const id = opp.strategy_opportunity_id
    setTogglingIds((prev) => new Set(prev).add(id))
    setAvailabilityError(null)
    try {
      const detail = await fetchOpportunityDetail(id)
      const payload = opportunityDetailToPayload(detail)
      await putOpportunity(id, { ...payload, is_active: !opp.is_active })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategy.opportunities })
    } catch (e) {
      setAvailabilityError(e instanceof Error ? e.message : String(e))
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function handleNew() {
    setEditTarget(undefined)
    setPrefillData(undefined)
    setModalOpen(true)
  }

  function handleEdit(opp: StrategyOpportunity) {
    setEditTarget(opp)
    setPrefillData(undefined)
    setModalOpen(true)
  }

  async function handleCopy(opp: StrategyOpportunity) {
    setCopyLoadingId(opp.strategy_opportunity_id)
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ['strategy', 'opportunity-detail', opp.strategy_opportunity_id],
        queryFn: () => fetchOpportunityDetail(opp.strategy_opportunity_id),
        staleTime: 120_000,
      })
      setPrefillData({
        name: `${detail.name} (copy)`,
        structureId: detail.strategy_structure_id != null ? String(detail.strategy_structure_id) : '',
        gateSafetyId: detail.default_gate_safety_strategy_id != null
          ? String(detail.default_gate_safety_strategy_id) : '',
        scopeType: detail.scope_type ?? '',
        symbols: detail.symbols ?? [],
        conditions: detail.entry_conditions ?? [],
      })
      setEditTarget(undefined)
      setModalOpen(true)
    } finally {
      setCopyLoadingId(null)
    }
  }

  if (isLoading) {
    return (
      <PageShell className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-64 rounded-lg" />
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="Strategy / Opportunity"
        description="Define opportunity strategies linked to a structure; scope and entry conditions."
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-medium tracking-tight">Opportunity strategies</h2>
          <div className="flex flex-wrap items-center gap-3">
            <AvailabilityFilterPills value={filter} onChange={setFilter} />
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create opportunity
            </Button>
          </div>
        </div>

        {isError && (
          <QueryErrorAlert error={error} onRetry={() => void refetch()} />
        )}

        {!isError && allItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No opportunity strategies in database.</p>
        )}

        {!isError && allItems.length > 0 && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No opportunities match the current filter.</p>
        )}

        {!isError && items.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={TABLE_HEAD_CLASS}>Name</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Structure</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Scope</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Gate safety</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[5.5rem] text-center')}>Available</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-36')} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((opp) => {
                  const scopeDisplay = getScopeDisplay(opp.scope_type, opp.symbols)
                  const copying = copyLoadingId === opp.strategy_opportunity_id
                  return (
                    <TableRow key={opp.strategy_opportunity_id}>
                      <TableCell className="font-medium">{opp.name}</TableCell>
                      <TableCell className="text-sm">
                        {opp.structure_name ?? opp.strategy_structure_id ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[14rem]">
                        <span
                          className="block truncate text-sm"
                          title={scopeDisplay.title || undefined}
                        >
                          {scopeDisplay.text}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {opp.gate_safety_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={opp.is_active}
                          disabled={togglingIds.size > 0}
                          onCheckedChange={() => void handleToggle(opp)}
                          aria-label={`Mark "${opp.name}" as ${opp.is_active ? 'unavailable' : 'available'}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => handleEdit(opp)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            disabled={copying}
                            onClick={() => void handleCopy(opp)}
                          >
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
      </section>

      <OpportunityFormModal
        key={editTarget?.strategy_opportunity_id ?? (prefillData ? 'copy' : 'new')}
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v)
          if (!v) {
            setEditTarget(undefined)
            setPrefillData(undefined)
          }
        }}
        initial={editTarget}
        prefill={prefillData}
      />

      <Dialog open={availabilityError != null} onOpenChange={(open) => { if (!open) setAvailabilityError(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cannot change availability</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap pt-1">
              {availabilityError}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAvailabilityError(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
