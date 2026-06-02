import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { InstanceDetailPanel } from '@/components/strategy/InstanceDetailPanel'
import { useStrategyInstance } from '@/hooks/useStrategies'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'
import { inspectorShell } from '@/components/layout/rightInspectorUi'

interface Props {
  instanceId: number
  onClose?: () => void
}

/** Positions right inspector — loads instance by id then renders shared detail panel. */
export function StrategyInstanceInspectorPanel({ instanceId, onClose }: Props) {
  const { data: instance, isLoading, isError, error } = useStrategyInstance(instanceId)

  if (isLoading) {
    return (
      <>
        <RightInspectorHeader
          title="Strategy Instance"
          meta={`· #${instanceId}`}
          onClose={onClose}
          closeLabel="Close strategy instance detail"
        />
        <div className={`${inspectorShell.section} space-y-3`} aria-busy="true">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    )
  }

  if (isError || !instance) {
    return (
      <>
        <RightInspectorHeader
          title="Strategy Instance"
          meta={`· #${instanceId}`}
          onClose={onClose}
          closeLabel="Close strategy instance detail"
        />
        <div className={inspectorShell.section}>
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : `Failed to load strategy instance #${instanceId}.`}
            </AlertDescription>
          </Alert>
        </div>
      </>
    )
  }

  const title = instance.label?.trim() || instance.strategy_opportunity_name?.trim() || 'Strategy Instance'

  return (
    <>
      <RightInspectorHeader
        title={title}
        meta={`· #${instance.strategy_instance_id}`}
        onClose={onClose}
        closeLabel="Close strategy instance detail"
      />
      <InstanceDetailPanel instance={instance} />
    </>
  )
}
