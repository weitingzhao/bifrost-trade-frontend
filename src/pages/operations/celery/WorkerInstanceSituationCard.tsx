import { CeleryWorkerInstanceSituation } from './CeleryWorkerInstanceSituation'
import { CelerySectionCard } from './CelerySectionCard'
import { useWorkerProfiles, useWorkerInstances, useOpsWorkers } from '@/hooks/useOpsData'

const SITUATION_TOOLTIP =
  'Per profile: max_worker_instances from ops.worker_profiles (GET /ops/workers/profiles). Dev and Prod columns count Celery workers on the broker whose nodename instance id matches the profile (GET /ops/workers), using worker_config_profile from Redis presence (BIFROST_CONFIG). Workers without dev/prod in presence are summarized in the row hover text. Add all / Reset use on-host systemd counts toward max. Edit config.yaml and reload Ops to change limits.'

export function WorkerInstanceSituationCard() {
  const { data: profilesData } = useWorkerProfiles()
  const { data: instancesData } = useWorkerInstances()
  const { data: workersData } = useOpsWorkers()

  return (
    <CelerySectionCard title="Worker instance situation" tooltip={SITUATION_TOOLTIP}>
      <CeleryWorkerInstanceSituation
        profiles={profilesData?.profiles ?? []}
        instances={instancesData?.instances ?? []}
        workers={workersData?.workers ?? []}
      />
    </CelerySectionCard>
  )
}
