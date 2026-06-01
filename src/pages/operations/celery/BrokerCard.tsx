import { useState } from 'react'
import { StatusLamp } from '@/components/StatusLamp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from './ConfirmDialog'
import { CelerySectionCard } from './CelerySectionCard'
import { useOpsWorkers, useControlBroker } from '@/hooks/useOpsData'

const BROKER_TOOLTIP =
  'Redis broker systemd control on this Ops host. Start / Restart / Stop require an Ops API token with operate permission.'

export function BrokerCard() {
  const { data, isLoading } = useOpsWorkers()
  const controlBroker = useControlBroker()
  const [confirm, setConfirm] = useState<{
    action: () => Promise<void>
    title: string
    message: string
  } | null>(null)

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />
  if (!data) return null

  const { broker } = data

  const brokerBtn = (label: string, action: () => Promise<void>) => (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      disabled={controlBroker.isPending}
      onClick={() =>
        setConfirm({
          action,
          title: `${label} broker`,
          message: `Are you sure you want to ${label.toLowerCase()} the Redis broker?`,
        })
      }
    >
      {label}
    </Button>
  )

  return (
    <>
      <CelerySectionCard
        title={
          <>
            <StatusLamp lamp={broker.connected ? 'green' : 'red'} />
            Redis / Broker
          </>
        }
        tooltip={BROKER_TOOLTIP}
        headerExtra={
          <span className="flex gap-1">
            {brokerBtn('Start', () => controlBroker.mutateAsync('start').then(() => {}))}
            {brokerBtn('Restart', () => controlBroker.mutateAsync('restart').then(() => {}))}
            {brokerBtn('Stop', () => controlBroker.mutateAsync('stop').then(() => {}))}
          </span>
        }
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={broker.connected ? 'default' : 'destructive'}>
              {broker.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
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
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Workers</p>
            <p className="font-mono text-sm">{data.count}</p>
          </div>
        </div>
      </CelerySectionCard>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        onConfirm={async () => {
          await confirm?.action()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
