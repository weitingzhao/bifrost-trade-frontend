import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { InstanceDetailPanel } from '@/components/strategy/InstanceDetailPanel'
import { useStrategyInstance } from '@/hooks/useStrategies'

interface Props {
  instanceId: number
}

/** Positions right inspector — loads instance by id then renders shared detail panel. */
export function StrategyInstanceInspectorPanel({ instanceId }: Props) {
  const { data: instance, isLoading, isError, error } = useStrategyInstance(instanceId)

  if (isLoading) {
    return (
      <div className="p-3 space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !instance) {
    return (
      <div className="p-3">
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : `Failed to load strategy instance #${instanceId}.`}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <InstanceDetailPanel instance={instance} />
}
