import { useState, useMemo } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useStructures } from '@/hooks/useStrategies'
import { putStructure } from '@/api/strategy'
import type { StrategyStructure, StructureLeg, StructureConstraint } from '@/types/positions'

type ActiveFilter = 'all' | 'active' | 'inactive'

function LegBadge({ leg }: { leg: StructureLeg }) {
  const isShort = leg.direction?.toLowerCase() === 'short' || leg.role?.toLowerCase() === 'short'
  const right = leg.option_right ? leg.option_right.toUpperCase() : null
  const parts = [leg.role ?? leg.direction, right ?? '—', `×${leg.quantity}`].filter(Boolean)
  return (
    <span
      className={cn(
        'inline-block text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium mr-1 mb-0.5',
        isShort
          ? 'text-red-500 border-red-500/50'
          : 'text-green-600 dark:text-green-400 border-green-600/50',
      )}
    >
      {parts.join(' ')}
    </span>
  )
}

function DimBadges({ s }: { s: StrategyStructure }) {
  const dims = [
    s.dim_direction, s.dim_structure, s.dim_coverage,
    s.dim_risk, s.dim_volatility, s.dim_time,
  ].filter(Boolean) as string[]
  if (dims.length === 0) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-0.5">
      {dims.map((d) => (
        <span key={d} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {d}
        </span>
      ))}
    </div>
  )
}

function constraintSummary(constraints: StructureConstraint[]): string {
  if (constraints.length === 0) return '—'
  return constraints
    .map((c) => `${c.constraint_type}:${c.constraint_value_int ?? c.constraint_value_text ?? '?'}`)
    .join('  ')
}

export default function StructuresPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useStructures()
  const [filter, setFilter] = useState<ActiveFilter>('all')
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  const allItems = useMemo(() => data?.items ?? [], [data])

  const items = useMemo(() => {
    if (filter === 'active') return allItems.filter((s) => s.is_active)
    if (filter === 'inactive') return allItems.filter((s) => !s.is_active)
    return allItems
  }, [allItems, filter])

  async function handleToggle(id: number, current: boolean) {
    setTogglingIds((prev) => new Set(prev).add(id))
    try {
      await putStructure(id, { is_active: !current })
      queryClient.invalidateQueries({ queryKey: ['strategy', 'structures'] })
    } finally {
      setTogglingIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  if (isLoading) {
    return (
      <PageShell className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-48 rounded-lg" />
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Structures"
        actions={
          <>
            <Badge variant="secondary">{items.length}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['strategy', 'structures'] })}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </>
        }
      />

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
        <p className="text-sm text-muted-foreground py-4">No structures found.</p>
      )}

      {items.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-16 text-right">Ver</TableHead>
                <TableHead className="w-40">Template</TableHead>
                <TableHead className="w-44">Dims</TableHead>
                <TableHead>Legs</TableHead>
                <TableHead>Constraints</TableHead>
                <TableHead className="w-24 text-center">Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.strategy_structure_id} className={cn(!s.is_active && 'opacity-60')}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{s.strategy_structure_id}
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-xs text-muted-foreground">v{s.version}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.template_display_name ?? s.template_code ?? '—'}
                  </TableCell>
                  <TableCell><DimBadges s={s} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap">
                      {s.legs.map((leg, i) => (
                        <LegBadge key={`${leg.option_right ?? ''}-${leg.role ?? ''}-${leg.strike ?? ''}-${i}`} leg={leg} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                    {constraintSummary(s.constraints)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      disabled={togglingIds.has(s.strategy_structure_id)}
                      onClick={() => handleToggle(s.strategy_structure_id, s.is_active)}
                      className={cn(
                        'text-[10px] px-2.5 py-0.5 rounded-full border transition-colors disabled:opacity-50',
                        s.is_active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                      )}
                    >
                      {s.is_active ? 'ON' : 'OFF'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageShell>
  )
}
