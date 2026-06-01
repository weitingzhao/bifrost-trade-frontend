import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getOpsToken } from '@/api/ops'
import { useOpsCapabilities } from '@/hooks/useSocketServices'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useCeleryOpsAuth() {
  const [token, setTokenState] = useState(() => getOpsToken())
  const qc = useQueryClient()
  const { data: caps, refetch: refetchCaps } = useOpsCapabilities(token)

  const canOperate = caps?.capabilities?.can_operate === true
  const canAdmin = caps?.capabilities?.can_admin === true

  const invalidateOpsQueries = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.workers })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.queuesSummary })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.workerInstances })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.celeryCapabilities })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.aggregatedJobs })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.brokerStatus })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.massiveJobs })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.barsJobs })
  }, [qc])

  const setToken = useCallback(
    (next: string) => {
      setTokenState(next)
      invalidateOpsQueries()
      void refetchCaps()
    },
    [invalidateOpsQueries, refetchCaps],
  )

  const refreshAuth = useCallback(() => {
    invalidateOpsQueries()
    void refetchCaps()
  }, [invalidateOpsQueries, refetchCaps])

  return {
    token,
    caps,
    canOperate,
    canAdmin,
    setToken,
    refreshAuth,
    invalidateOpsQueries,
  }
}
