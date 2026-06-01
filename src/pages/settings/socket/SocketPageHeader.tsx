import { Radio } from 'lucide-react'
import { StatusLamp } from '@/components/StatusLamp'
import type { OpsHealthResponse, OpsCapabilities } from '@/api/ops'
import type { StatusResponse } from '@/types/monitor'
import type { MarketIngestServiceRow } from '@/utils/socketIngestLamp'
import {
  aggregateIngestRedisHealthLamp,
  buildUnifiedIngestRows,
} from '@/utils/socketIngestLamp'
import { socketServicesHostColumnDisplay } from '@/utils/ingestOpsShared'
import { OpsHostEnvPill } from './OpsHostEnvPill'
import { OpsAuthBar } from './OpsAuthBar'

export function SocketPageHeader({
  services,
  status,
  opsHealth,
  caps,
  token,
  onTokenChange,
  onRefresh,
}: {
  services: MarketIngestServiceRow[]
  status: StatusResponse | null
  opsHealth: OpsHealthResponse | undefined
  caps: OpsCapabilities | undefined
  token: string
  onTokenChange: (token: string) => void
  onRefresh: () => void
}) {
  const rows = buildUnifiedIngestRows(services)
  const aggregate = aggregateIngestRedisHealthLamp(rows.map(r => r.svc), status)
  const hostColumn = socketServicesHostColumnDisplay({
    configProfile: opsHealth?.config_profile ?? null,
    localControl: opsHealth?.local_control ?? null,
    marketIngestScriptControl: opsHealth?.market_ingest_script_control === true,
  })

  const lampColor = aggregate.lamp === 'none' ? 'gray' : aggregate.lamp

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Radio className="h-5 w-5 text-orange-400 shrink-0" aria-hidden />
            <StatusLamp lamp={lampColor} className="h-3 w-3" />
            <h1 className="text-2xl font-semibold tracking-tight">Socket Services</h1>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span title={hostColumn.title}>This Ops instance (config / executor)</span>
            <OpsHostEnvPill pill={hostColumn.pill} title={hostColumn.title} />
          </p>
        </div>
        <OpsAuthBar
          token={token}
          caps={caps}
          onTokenChange={onTokenChange}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  )
}
