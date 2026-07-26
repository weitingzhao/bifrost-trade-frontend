import { CeleryWorkerInstanceSituation } from './CeleryWorkerInstanceSituation'
import { CelerySectionCard } from './CelerySectionCard'
import { useWorkerProfiles, useWorkerInstances, useOpsWorkers } from '@/hooks/useOpsData'

export function WorkerInstanceSituationCard() {
  const { data: profilesData } = useWorkerProfiles()
  const { data: instancesData } = useWorkerInstances()
  const { data: workersData } = useOpsWorkers()

  return (
    <CelerySectionCard
      title="Worker instance situation"
      tooltip="Per-profile worker observations from Kubernetes and Celery inspect. Deployment replicas, not systemd units, control Kubernetes worker scale."
    >
      <CeleryWorkerInstanceSituation
        profiles={profilesData?.profiles ?? []}
        instances={instancesData?.instances ?? []}
        workers={workersData?.workers ?? []}
      />
    </CelerySectionCard>
  )
}
