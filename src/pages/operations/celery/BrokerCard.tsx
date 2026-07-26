import { StatusLamp } from '@/components/StatusLamp'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CelerySectionCard } from './CelerySectionCard'
import { useBrokerStatusExtended } from '@/hooks/useOpsData'

const BROKER_TOOLTIP =
  'Redis broker status. Broker lifecycle is managed by Kubernetes; this page is read-only.'

export function BrokerCard() {
  const { data: extData, isLoading: extLoading } = useBrokerStatusExtended()

  if (extLoading) return <Skeleton className="h-24 rounded-lg" />
  const broker = extData?.broker
  if (!broker) return null

  return (
    <CelerySectionCard
      title={
        <>
          <StatusLamp lamp={broker.connected ? 'green' : 'red'} />
          Redis / Broker
        </>
      }
      tooltip={BROKER_TOOLTIP}
      headerExtra={<span className="text-xs text-muted-foreground">Managed by Kubernetes</span>}
    >
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant={broker.connected ? 'default' : 'destructive'}>
            {broker.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        {broker.url_masked && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">URL</p>
            <p className="font-mono text-xs">{broker.url_masked}</p>
          </div>
        )}
        {broker.used_memory_human && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Memory</p>
            <p className="font-mono text-sm">{broker.used_memory_human}</p>
          </div>
        )}
        {broker.connected_clients != null && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Clients</p>
            <p className="font-mono text-sm">{broker.connected_clients}</p>
          </div>
        )}
      </div>
    </CelerySectionCard>
  )
}
