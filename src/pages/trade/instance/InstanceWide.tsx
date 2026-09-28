/**
 * The Instance page's wide face (design Rev .103). Batch T1 carries the
 * shared record; T2 lays out the page's six blocks around it.
 */
import { InstanceRecord } from '@/components/instanceRecord/InstanceRecord'
import type { StrategyInstance } from '@/types/positions'
import type { RanUnder } from '@/utils/instanceRecord/ranUnder'

export function InstanceWide({
  instance,
  from,
  pos,
  onPrev,
  onNext,
  ranUnder,
}: {
  instance: StrategyInstance
  list?: readonly number[]
  from: string
  pos?: string
  onPrev?: () => void
  onNext?: () => void
  ranUnder: RanUnder | null
}) {
  return (
    <InstanceRecord
      instance={instance}
      mode="inline"
      title={`#${instance.strategy_instance_id}`}
      opportunity={instance.strategy_opportunity_name ?? '—'}
      structure={instance.strategy_structure_name ?? '—'}
      pos={pos}
      from={from || undefined}
      onPrev={onPrev}
      onNext={onNext}
      ranUnder={ranUnder ?? undefined}
    />
  )
}
