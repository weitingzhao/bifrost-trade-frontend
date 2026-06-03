import { useState, useMemo } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { SegmentControl } from '@/components/data-display'
import type { AvailabilityFilter } from '@/components/strategy/AvailabilityFilterPills'
import { OpportunitiesTable } from '@/components/strategy/OpportunitiesTable'
import { OpportunityFormModal } from '@/components/strategy/OpportunityFormModal'
import {
  opportunitiesEmptyHintClass,
  opportunitiesSectionTitleClass,
  opportunitiesToolbarActionsClass,
  opportunitiesToolbarClass,
  opportunitiesToolbarLabelClass,
} from '@/components/strategy/opportunities/opportunitiesUi'
import { useOpportunities } from '@/hooks/useStrategies'
import { putOpportunity, fetchOpportunityDetail } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { opportunityDetailToPayload, opportunityIsActive } from '@/utils/strategyFormUtils'
import type { StrategyOpportunity, EntryCondition } from '@/types/positions'

interface PrefillData {
  name: string
  structureId: string
  gateSafetyId: string
  scopeType: string
  symbols: string[]
  conditions: EntryCondition[]
}

const OPPORTUNITY_INFO =
  'Define opportunity strategies linked to a structure; scope and entry conditions.'

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Available' },
  { value: 'inactive', label: 'Unavailable' },
]

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

  const allItems = useMemo(
    () =>
      (data?.items ?? []).map((o) => ({
        ...o,
        is_active: opportunityIsActive(o.is_active),
      })),
    [data],
  )

  const items = useMemo(() => {
    if (filter === 'active') return allItems.filter((o) => o.is_active)
    if (filter === 'inactive') return allItems.filter((o) => !o.is_active)
    return allItems
  }, [allItems, filter])

  async function handleToggle(opp: StrategyOpportunity) {
    const id = opp.strategy_opportunity_id
    const nextActive = !opp.is_active
    setTogglingIds((prev) => new Set(prev).add(id))
    setAvailabilityError(null)
    queryClient.setQueryData<{ items: StrategyOpportunity[] }>(
      [...QUERY_KEYS.strategy.opportunities, false],
      (old) => {
        if (!old?.items) return old
        return {
          items: old.items.map((row) =>
            row.strategy_opportunity_id === id ? { ...row, is_active: nextActive } : row,
          ),
        }
      },
    )
    try {
      const detail = await fetchOpportunityDetail(id)
      const payload = opportunityDetailToPayload(detail)
      await putOpportunity(id, { ...payload, is_active: nextActive })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategy.opportunities })
    } catch (e) {
      setAvailabilityError(e instanceof Error ? e.message : String(e))
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategy.opportunities })
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
      <PageShell padding="default" className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 rounded-lg" />
      </PageShell>
    )
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1">
            Strategy / Opportunity
            <InfoTooltip text={OPPORTUNITY_INFO} />
          </span>
        }
        titleSize="large"
      />

      <Card variant="elevated" size="sm" className="gap-3 p-2.5">
        <div className={opportunitiesToolbarClass}>
          <h2 className={opportunitiesSectionTitleClass}>Opportunity strategies</h2>
          <div className={opportunitiesToolbarActionsClass}>
            <span className={opportunitiesToolbarLabelClass}>Availability</span>
            <SegmentControl
              size="sm"
              ariaLabel="Filter by availability"
              value={filter}
              onChange={(v) => setFilter(v as AvailabilityFilter)}
              options={AVAILABILITY_OPTIONS}
            />
            <Button size="sm" onClick={handleNew}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Create opportunity
            </Button>
          </div>
        </div>

        {isError && <QueryErrorAlert error={error} onRetry={() => void refetch()} />}

        {!isError && allItems.length === 0 && (
          <p className={opportunitiesEmptyHintClass}>No opportunity strategies in database.</p>
        )}

        {!isError && allItems.length > 0 && items.length === 0 && (
          <p className={opportunitiesEmptyHintClass}>No opportunities match the current filter.</p>
        )}

        {!isError && items.length > 0 && (
          <OpportunitiesTable
            rows={items}
            togglingIds={togglingIds}
            copyLoadingId={copyLoadingId}
            onToggle={(opp) => void handleToggle(opp)}
            onEdit={handleEdit}
            onCopy={(opp) => void handleCopy(opp)}
          />
        )}

        <OpportunityFormModal
          key={editTarget?.strategy_opportunity_id ?? (prefillData ? 'copy' : 'new')}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditTarget(undefined)
            setPrefillData(undefined)
          }}
          initial={editTarget}
          prefill={prefillData}
        />
      </Card>

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
