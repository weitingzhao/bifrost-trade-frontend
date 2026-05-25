import { useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InstancesTable } from '@/components/strategy/InstancesTable'
import { InstanceCreateModal } from '@/components/strategy/InstanceCreateModal'
import { InstanceDeleteModal } from '@/components/strategy/InstanceDeleteModal'
import { useStrategyInstances } from '@/hooks/useStrategies'
import { useInstanceMetrics } from '@/hooks/useInstanceMetrics'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import type { StrategyInstance } from '@/types/positions'

type SinceFilter = '1m' | '3m' | '6m' | 'all'

const SINCE_LABELS: Record<SinceFilter, string> = {
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
  'all': 'All',
}

function sinceThreshold(since: SinceFilter): number | null {
  const now = Date.now()
  if (since === '1m') return now - 30 * 86_400_000
  if (since === '3m') return now - 90 * 86_400_000
  if (since === '6m') return now - 180 * 86_400_000
  return null
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n)
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`
  return n < 0 ? `-${s}` : `+${s}`
}

export default function InstancesPage() {
  const queryClient = useQueryClient()
  const { data: status } = useMonitorStatus()
  const { data, isLoading, isError, error } = useStrategyInstances()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StrategyInstance | null>(null)
  const [since, setSince] = useState<SinceFilter>('3m')
  const [structureFilter, setStructureFilter] = useState<string>('all')

  const allInstances = useMemo(() => data?.items ?? [], [data])

  const metricsMap = useInstanceMetrics(allInstances)

  const structures = useMemo(() => {
    const names = new Set(
      allInstances.map((i) => i.strategy_structure_name).filter(Boolean) as string[],
    )
    return Array.from(names).sort()
  }, [allInstances])

  const filtered = useMemo(() => {
    const threshold = sinceThreshold(since)
    return allInstances.filter((inst) => {
      if (structureFilter !== 'all' && inst.strategy_structure_name !== structureFilter) return false
      if (threshold != null && inst.opened_at_epoch != null) {
        if (inst.opened_at_epoch * 1000 < threshold) return false
      }
      return true
    })
  }, [allInstances, since, structureFilter])

  const totalNetPnl = useMemo(() => {
    let sum = 0
    let allReady = true
    for (const inst of filtered) {
      const entry = metricsMap.get(inst.strategy_instance_id)
      if (!entry || entry.status !== 'ready') { allReady = false; continue }
      sum += entry.metrics.netPnl
    }
    return allReady ? sum : null
  }, [filtered, metricsMap])

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Strategy Instances</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {filtered.length} of {allInstances.length} instances
            </span>
            {totalNetPnl != null && (
              <span className={cn(
                'text-xs font-mono font-medium',
                totalNetPnl > 0 ? 'text-green-600 dark:text-green-400' : totalNetPnl < 0 ? 'text-red-500' : 'text-muted-foreground',
              )}>
                Net PnL {fmtUsd(totalNetPnl)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['strategy', 'instances'] })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Instance
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Since:</span>
          {(Object.keys(SINCE_LABELS) as SinceFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSince(key)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                since === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
              )}
            >
              {SINCE_LABELS[key]}
            </button>
          ))}
        </div>

        {structures.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Structure:</span>
            {(['all', ...structures] as const).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setStructureFilter(name)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors',
                  structureFilter === name
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                )}
              >
                {name === 'all' ? 'All' : name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <InstancesTable
        instances={filtered}
        metricsMap={metricsMap}
        onDelete={setDeleteTarget}
      />

      <InstanceCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        status={status}
      />
      <InstanceDeleteModal
        instance={deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      />
    </div>
  )
}
