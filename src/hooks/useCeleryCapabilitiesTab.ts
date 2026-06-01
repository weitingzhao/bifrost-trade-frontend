import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCeleryCapabilities } from '@/api/ops'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { setBrokerQueueLabelsFromApi } from '@/utils/celeryQueueLabels'
import type { CeleryMainTab } from '@/pages/operations/celery/celeryTypes'

const CAPABILITIES_TABS: CeleryMainTab[] = ['support_tasks', 'scheduled_jobs']

export function useCeleryCapabilitiesTab(mainTab: CeleryMainTab, enabled = true) {
  const enabledTab = enabled && CAPABILITIES_TABS.includes(mainTab)

  const query = useQuery({
    queryKey: QUERY_KEYS.ops.celeryCapabilities,
    queryFn: fetchCeleryCapabilities,
    enabled: enabledTab,
    staleTime: 120_000,
  })

  useEffect(() => {
    if (query.data?.broker_queue_labels) {
      setBrokerQueueLabelsFromApi(query.data.broker_queue_labels)
    }
  }, [query.data?.broker_queue_labels])

  return query
}

export function useInvalidateCeleryCapabilities() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.celeryCapabilities })
}
