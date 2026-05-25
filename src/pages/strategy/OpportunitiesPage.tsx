import { useState, useMemo } from 'react'
import { useQueryClient, useQueries } from '@tanstack/react-query'
import { RefreshCw, Plus, Pencil, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useOpportunities } from '@/hooks/useStrategies'
import { putOpportunity, fetchOpportunityDetail } from '@/api/strategy'
import { OpportunityFormModal } from '@/components/strategy/OpportunityFormModal'
import type { StrategyOpportunity, EntryCondition } from '@/types/positions'

interface PrefillData {
  name: string
  structureId: string
  gateSafetyId: string
  scopeType: string
  symbols: string[]
  conditions: EntryCondition[]
}

type ActiveFilter = 'all' | 'active' | 'inactive'

function structureColor(name: string | null): string {
  if (!name) return 'hsl(0 0% 60%)'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return `hsl(${h} 65% 55%)`
}

function ScopeLabel({ scope }: { scope: string | null }) {
  if (!scope) return <span className="text-muted-foreground text-xs">—</span>
  const label = scope === 'watchlist_stk' ? 'watchlist' : scope === 'explicit_symbols' ? 'explicit' : scope
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground font-mono">
      {label}
    </span>
  )
}

function SymbolPills({ symbols }: { symbols: string[] }) {
  const MAX = 3
  if (symbols.length === 0) return <span className="text-xs text-muted-foreground">—</span>
  const visible = symbols.slice(0, MAX)
  const rest = symbols.length - MAX
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((s) => (
        <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground">
          {s}
        </span>
      ))}
      {rest > 0 && <span className="text-[10px] text-muted-foreground">+{rest}</span>}
    </div>
  )
}

export default function OpportunitiesPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useOpportunities()
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<ActiveFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StrategyOpportunity | undefined>(undefined)
  const [prefillData, setPrefillData] = useState<PrefillData | undefined>(undefined)
  const [copyLoadingId, setCopyLoadingId] = useState<number | null>(null)

  const allItems = useMemo(() => data?.items ?? [], [data])

  const items = useMemo(() => {
    const base = filter === 'active'
      ? allItems.filter((o) => o.is_active)
      : filter === 'inactive'
        ? allItems.filter((o) => !o.is_active)
        : allItems
    return [...base].sort((a, b) => Number(b.is_active) - Number(a.is_active))
  }, [allItems, filter])

  const detailQueries = useQueries({
    queries: allItems.map((opp) => ({
      queryKey: ['strategy', 'opportunity-detail', opp.strategy_opportunity_id],
      queryFn: () => fetchOpportunityDetail(opp.strategy_opportunity_id),
      staleTime: 120_000,
      enabled: allItems.length > 0,
    })),
  })

  const ecCountMap = useMemo(() => {
    const m = new Map<number, number>()
    for (const q of detailQueries) {
      if (q.data) m.set(q.data.strategy_opportunity_id, q.data.entry_conditions.length)
    }
    return m
  }, [detailQueries])

  async function handleToggle(opp: StrategyOpportunity) {
    setTogglingIds((prev) => new Set(prev).add(opp.strategy_opportunity_id))
    try {
      await putOpportunity(opp.strategy_opportunity_id, { is_active: !opp.is_active })
      queryClient.invalidateQueries({ queryKey: ['strategy', 'opportunities'] })
    } finally {
      setTogglingIds((prev) => { const n = new Set(prev); n.delete(opp.strategy_opportunity_id); return n })
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
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Opportunities</h1>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['strategy', 'opportunities'] })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Opportunity
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border transition-colors capitalize',
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {items.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground py-4">No opportunities found.</p>
      )}

      {items.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-32">Structure</TableHead>
                <TableHead className="w-24">Scope</TableHead>
                <TableHead>Symbols</TableHead>
                <TableHead className="w-36">Gate Safety</TableHead>
                <TableHead className="w-20 text-center">Conds</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((opp) => (
                <TableRow key={opp.strategy_opportunity_id} className={cn(!opp.is_active && 'opacity-60')}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{opp.strategy_opportunity_id}
                  </TableCell>
                  <TableCell className="font-medium">{opp.name}</TableCell>
                  <TableCell>
                    {opp.structure_name ? (
                      <span
                        className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          color: structureColor(opp.structure_name),
                          border: `1px solid ${structureColor(opp.structure_name)}`,
                          opacity: 0.85,
                        }}
                      >
                        {opp.structure_name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell><ScopeLabel scope={opp.scope_type} /></TableCell>
                  <TableCell><SymbolPills symbols={opp.symbols} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {opp.gate_safety_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const count = ecCountMap.get(opp.strategy_opportunity_id)
                      if (count == null) return <span className="text-xs text-muted-foreground font-mono">…</span>
                      if (count === 0) return <span className="text-xs text-muted-foreground font-mono">—</span>
                      return <span className="text-xs font-mono text-foreground">{count}</span>
                    })()}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      disabled={togglingIds.has(opp.strategy_opportunity_id)}
                      onClick={() => handleToggle(opp)}
                      className={cn(
                        'text-[10px] px-2.5 py-0.5 rounded-full border transition-colors disabled:opacity-50',
                        opp.is_active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                      )}
                    >
                      {opp.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell className="p-1">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-50"
                        disabled={copyLoadingId === opp.strategy_opportunity_id}
                        onClick={() => handleCopy(opp)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(opp)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <OpportunityFormModal
        key={editTarget?.strategy_opportunity_id ?? (prefillData ? 'copy' : 'new')}
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v)
          if (!v) { setEditTarget(undefined); setPrefillData(undefined) }
        }}
        initial={editTarget}
        prefill={prefillData}
      />
    </div>
  )
}
