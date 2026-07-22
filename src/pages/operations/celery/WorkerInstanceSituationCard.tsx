import { CeleryWorkerInstanceSituation } from './CeleryWorkerInstanceSituation'
import { CelerySectionCard } from './CelerySectionCard'
import { useWorkerProfiles, useWorkerInstances, useOpsWorkers } from '@/hooks/useOpsData'
import { useOpsHealth } from '@/hooks/useSocketServices'
import { useCeleryOps } from './useCeleryOps'

export function WorkerInstanceSituationCard() {
  const { data: profilesData } = useWorkerProfiles()
  const { data: instancesData } = useWorkerInstances()
  const { data: workersData } = useOpsWorkers()
  const { token } = useCeleryOps()
  const { data: opsHealth } = useOpsHealth(token)
  const isK8s = (opsHealth?.executor_mode ?? '').toLowerCase() === 'kubernetes'

  return (
    <CelerySectionCard
      title="Worker instance situation"
      tooltip={
        isK8s
          ? 'Per-profile worker observations from Kubernetes and Celery inspect. Deployment replicas, not systemd units, control Kubernetes worker scale.'
          : 'Per profile: max_worker_instances from ops.worker_profiles. Dev and Prod columns count Celery workers reported by Redis presence.'
      }
    >
      <CeleryWorkerInstanceSituation
        profiles={profilesData?.profiles ?? []}
        instances={instancesData?.instances ?? []}
        workers={workersData?.workers ?? []}
        isK8s={isK8s}
      />
    </CelerySectionCard>
  )
}
