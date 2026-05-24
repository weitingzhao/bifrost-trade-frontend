import { useQueries } from '@tanstack/react-query'
import { fetchInstancePerformance, fetchInstanceExecutions } from '@/api/trading'
import { computeInstanceMetrics } from '@/utils/instanceCalc'
import type { StrategyInstance } from '@/types/positions'
import type { InstanceMetrics } from '@/utils/instanceCalc'

export type MetricsEntry =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; metrics: InstanceMetrics }

export function useInstanceMetrics(instances: StrategyInstance[]): Map<number, MetricsEntry> {
  const ids = instances.map((i) => i.strategy_instance_id)

  const perfResults = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['strategy', 'instance-perf', id],
      queryFn: () => fetchInstancePerformance(id),
      staleTime: 60_000,
    })),
  })

  const execResults = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['strategy', 'instance-execs', id],
      queryFn: () => fetchInstanceExecutions(id),
      staleTime: 60_000,
    })),
  })

  const map = new Map<number, MetricsEntry>()

  ids.forEach((id, i) => {
    const perf = perfResults[i]
    const execs = execResults[i]

    if (perf?.isError || execs?.isError) {
      map.set(id, { status: 'error' })
    } else if (!perf?.data || !execs?.data) {
      map.set(id, { status: 'loading' })
    } else {
      map.set(id, {
        status: 'ready',
        metrics: computeInstanceMetrics(
          perf.data.summary,
          execs.data.executions,
          instances[i].opened_at_epoch,
        ),
      })
    }
  })

  return map
}
