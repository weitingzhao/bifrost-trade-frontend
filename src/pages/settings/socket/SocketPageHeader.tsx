import { PageHeader } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
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
import { socketPageDescriptionClass } from './socketIngestUi'

const SOCKET_PAGE_INFO =
  'Ops-controlled ingest: Massive Options WS (Trade stack) and Platform IB Gateway components @ redis-ib (data/ib-gateway — not legacy trade-socket STS). Redis health from Monitor /status; IB rows on K8s are externally managed.'

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
    <PageHeader
      title={
        <div className="space-y-1">
          <span className="inline-flex items-center gap-2 flex-wrap">
            <StatusLamp lamp={lampColor} className="h-3 w-3" />
            Socket Services
            <InfoTooltip text={SOCKET_PAGE_INFO} />
          </span>
          <div className={socketPageDescriptionClass}>
            <span title={hostColumn.title}>This Ops instance (config / executor)</span>
            <OpsHostEnvPill pill={hostColumn.pill} title={hostColumn.title} />
          </div>
        </div>
      }
      titleSize="large"
      actions={
        <OpsAuthBar
          token={token}
          caps={caps}
          onTokenChange={onTokenChange}
          onRefresh={onRefresh}
        />
      }
    />
  )
}
