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
import { useOpsHealth } from '@/hooks/useSocketServices'
import { computeCeleryRuntimeLamp, runtimeLampText } from '@/utils/celeryRuntime'
import { useCeleryOps } from './useCeleryOps'

export function CeleryPageHeader() {
  const { data: workersData } = useOpsWorkers()
  const { token, caps, setToken, refreshAuth } = useCeleryOps()
  const { data: opsHealth } = useOpsHealth(token)
  const isK8s = (opsHealth?.executor_mode ?? '').toLowerCase() === 'kubernetes'
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
          <InfoTooltip
            text={
              isK8s
                ? 'Queue summary: broker and PostgreSQL job counts for every queue. Kubernetes Deployments manage workers; Console & Runtime shows live consoles and Celery inspect.'
                : 'Queue summary: broker and PostgreSQL job counts for every queue. Queues & Instances shows job queues, worker instances, and Redis/broker. Console & Runtime shows live consoles and Celery inspect.'
            }
          />
        </span>
      }
      description={
        isK8s
          ? 'Queue summary applies to all tabs. Kubernetes Deployments manage Celery worker scale and broker lifecycle.'
          : 'Queue summary applies to all tabs. Main sections: Queues & Instances or Console & Runtime.'
      }
      actions={
        <OpsAuthBar token={token} caps={caps} onTokenChange={setToken} onRefresh={refreshAuth} />
      }
    />
  )
}
