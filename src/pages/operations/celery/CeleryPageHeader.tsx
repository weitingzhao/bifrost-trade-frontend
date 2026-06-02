import { PageHeader } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OpsAuthBar } from '@/pages/settings/socket/OpsAuthBar'
import { useOpsWorkers } from '@/hooks/useOpsData'
import { computeCeleryRuntimeLamp, runtimeLampText } from '@/utils/celeryRuntime'
import { useCeleryOps } from './useCeleryOps'

const PAGE_INFO =
  'Queue summary (above tabs): broker + PostgreSQL job counts for every queue; same on all tabs. Queues & Instances: PostgreSQL job queues plus systemd worker instances and Redis/broker. Console & Runtime: live consoles and Celery inspect snapshot.'

const PAGE_DESCRIPTION =
  'Queue summary at the top applies to all tabs. Main sections: Queues & Instances (job tables + workers and broker), or Console & Runtime (streams and inspect snapshot).'

export function CeleryPageHeader() {
  const { data: workersData } = useOpsWorkers()
  const { token, caps, setToken, refreshAuth } = useCeleryOps()
  const workers = workersData?.workers ?? []
  const brokerConnected = workersData?.broker.connected
  const runtimeLamp = computeCeleryRuntimeLamp(brokerConnected ?? false, workers)
  const lampText = runtimeLampText(runtimeLamp)

  return (
    <PageHeader
      titleSize="large"
      title={
        <span className="inline-flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <StatusLamp lamp={runtimeLamp} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{lampText}</TooltipContent>
          </Tooltip>
          Celery
          <InfoTooltip text={PAGE_INFO} />
        </span>
      }
      description={PAGE_DESCRIPTION}
      actions={
        <OpsAuthBar token={token} caps={caps} onTokenChange={setToken} onRefresh={refreshAuth} />
      }
    />
  )
}
