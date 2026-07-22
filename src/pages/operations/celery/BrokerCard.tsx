import { useState } from 'react'
import { StatusLamp } from '@/components/StatusLamp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDialog } from './ConfirmDialog'
import { CelerySectionCard } from './CelerySectionCard'
import { useCeleryOps } from './useCeleryOps'
import { useBrokerStatusExtended, useControlBroker } from '@/hooks/useOpsData'
import { useOpsHealth } from '@/hooks/useSocketServices'

const BROKER_TOOLTIP =
  'Redis broker status. In Kubernetes mode, broker lifecycle is managed by Kubernetes rather than this page.'

export function BrokerCard() {
  const { canAdmin, showFlash, token } = useCeleryOps()
  const { data: opsHealth } = useOpsHealth(token)
  const isK8s = (opsHealth?.executor_mode ?? '').toLowerCase() === 'kubernetes'
  const { data: extData, isLoading: extLoading } = useBrokerStatusExtended()
  const controlBroker = useControlBroker()
  const [confirm, setConfirm] = useState<{
    action: () => Promise<void>
    title: string
    message: string
  } | null>(null)

  if (extLoading) return <Skeleton className="h-24 rounded-lg" />
  const broker = extData?.broker
  if (!broker) return null

  const locallyManaged = extData?.broker.locally_managed === true
  const canControl = canAdmin && locallyManaged

  const brokerBtn = (label: string, action: () => Promise<void>) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={controlBroker.isPending || !canControl}
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
      </TooltipTrigger>
      {!canAdmin ? (
        <TooltipContent>Requires admin role</TooltipContent>
      ) : !locallyManaged ? (
        <TooltipContent>Redis not under local systemd on this Ops host</TooltipContent>
      ) : null}
    </Tooltip>
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
          isK8s ? (
            <span className="text-xs text-muted-foreground">Managed by Kubernetes</span>
          ) : locallyManaged ? (
            <span className="flex gap-1">
              {brokerBtn('Start', () =>
                controlBroker.mutateAsync('start').then(r => {
                  if (!r.ok) throw new Error(r.error ?? 'Start failed')
                  showFlash('Broker start sent')
                }),
              )}
              {brokerBtn('Restart', () =>
                controlBroker.mutateAsync('restart').then(r => {
                  if (!r.ok) throw new Error(r.error ?? 'Restart failed')
                  showFlash('Broker restart sent')
                }),
              )}
              {brokerBtn('Stop', () =>
                controlBroker.mutateAsync('stop').then(r => {
                  if (!r.ok) throw new Error(r.error ?? 'Stop failed')
                  showFlash('Broker stopped')
                }),
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Read-only: broker is not locally managed.</span>
          )
        }
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

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        onConfirm={async () => {
          try {
            await confirm?.action()
          } catch (e) {
            showFlash(e instanceof Error ? e.message : 'Broker control failed', true)
          }
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
