import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Power } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusLamp } from '@/components/StatusLamp'
import { IconActionButton } from '@/components/data-display'
import { makeProbeQuery } from '@/hooks/useApiHealthProbes'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { Lamp, ServiceDef } from './apiHealthConfig'
import { EnvBadge } from './EnvBadge'
import type { ApiShutdownConfig } from './apiHealthShutdown'
import {
  apiHealthServiceCardContentClass,
  apiHealthServiceCardActionsClass,
  apiHealthServiceCardHeaderClass,
  apiHealthServiceCardNameClass,
  apiHealthServiceCardTitleRowClass,
  apiHealthServiceKvGridClass,
  apiHealthServiceKvLabelClass,
  apiHealthServiceKvValueClass,
  apiHealthServiceStatusClass,
  apiHealthShutdownMsgClass,
  apiHealthShutdownMsgOkClass,
} from './apiHealthUi'

export function ApiServiceHealthCard({
  svc,
  shutdown,
  shutdownMsg,
  forceDown,
  onRequestShutdown,
}: {
  svc: ServiceDef
  shutdown?: ApiShutdownConfig
  shutdownMsg?: string | null
  forceDown?: boolean
  onRequestShutdown?: (svc: ServiceDef, cfg: ApiShutdownConfig) => void
}) {
  const qc = useQueryClient()
  const { data, isPending, isError, error } = useQuery(makeProbeQuery(svc))
  const lamp: Lamp = forceDown ? 'red' : isPending ? 'yellow' : isError ? 'red' : 'green'
  const ok: boolean | null = forceDown ? false : isPending ? null : !isError
  const body = data?.body

  const statusText = forceDown
    ? 'Stopped or unreachable'
    : isPending
      ? 'Checking…'
      : isError
        ? `Unreachable · ${String((error as Error)?.message ?? 'Error')}`
        : `Running · ${data!.ms} ms`

  const canShutdown = shutdown && onRequestShutdown && !forceDown && !isPending && !isError

  return (
    <Card variant="elevated" size="sm">
      <CardContent className={apiHealthServiceCardContentClass}>
        <div className={apiHealthServiceCardHeaderClass}>
          <div className={apiHealthServiceCardTitleRowClass}>
            <StatusLamp lamp={lamp} />
            <span className={apiHealthServiceCardNameClass}>{svc.name}</span>
            {(body?.config_profile === 'dev' || body?.config_profile === 'prod') && (
              <EnvBadge profile={body.config_profile} ok={ok} compact />
            )}
          </div>
          <div className={apiHealthServiceCardActionsClass}>
            {canShutdown ? (
              <IconActionButton
                tone="danger"
                title={`Shut down ${shutdown.label}`}
                ariaLabel={`Shut down ${shutdown.label}`}
                onClick={() => onRequestShutdown(svc, shutdown)}
              >
                <Power className="h-3.5 w-3.5" />
              </IconActionButton>
            ) : null}
            <span className={apiHealthServiceStatusClass(lamp)}>{statusText}</span>
          </div>
        </div>

        {shutdownMsg ? (
          <p className={forceDown ? apiHealthShutdownMsgClass : apiHealthShutdownMsgOkClass}>
            {shutdownMsg}
          </p>
        ) : null}

        <div className={apiHealthServiceKvGridClass}>
          <span className={apiHealthServiceKvLabelClass}>Port</span>
          <span className={apiHealthServiceKvValueClass}>
            {typeof body?.port === 'number' ? body.port : svc.port}
          </span>

          {typeof body?.service === 'string' ? (
            <>
              <span className={apiHealthServiceKvLabelClass}>Service</span>
              <span className="font-mono">{body.service}</span>
            </>
          ) : null}

          {typeof body?.ts === 'number' ? (
            <>
              <span className={apiHealthServiceKvLabelClass}>Server time</span>
              <span className="tabular-nums">{new Date(body.ts * 1000).toLocaleString()}</span>
            </>
          ) : null}
        </div>

        {forceDown ? (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() =>
              void qc.invalidateQueries({ queryKey: [...QUERY_KEYS.settings.apiHealth, svc.key] })
            }
          >
            Re-check health
          </button>
        ) : null}
      </CardContent>
    </Card>
  )
}
