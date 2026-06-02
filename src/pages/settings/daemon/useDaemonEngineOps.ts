import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { StatusResponse } from '@/types/monitor'
import type { MarketIngestAction } from '@/api/ops'
import { getOpsToken } from '@/api/ops'
import {
  useMarketIngestServices,
  useOpsHealth,
  useOpsCapabilities,
  useControlMarketIngest,
} from '@/hooks/useSocketServices'
import { useIngestControlPoll } from '@/hooks/useIngestControlPoll'
import {
  aggregateDaemonProcessesHealthFromStatus,
  aggregateIngestRedisHealthLamp,
  marketIngestServicesForDaemonAggregate,
  type MarketIngestServiceRow,
} from '@/utils/socketIngestLamp'
import {
  normalizedPageDevProd,
  socketServicesHostColumnDisplay,
} from '@/utils/ingestOpsShared'
import { QUERY_KEYS } from '@/constants/queryKeys'

export type DaemonConfirmState = {
  open: boolean
  title: string
  message: string
  svc: MarketIngestServiceRow | null
  action: MarketIngestAction | null
}

export const CLOSED_DAEMON_CONFIRM: DaemonConfirmState = {
  open: false,
  title: '',
  message: '',
  svc: null,
  action: null,
}

export function useDaemonEngineOps(status: StatusResponse | null) {
  const [token, setToken] = useState(() => getOpsToken())
  const [elapsed, setElapsed] = useState(0)
  const [wallNowSec, setWallNowSec] = useState(() => Math.floor(Date.now() / 1000))
  const [confirm, setConfirm] = useState<DaemonConfirmState>(CLOSED_DAEMON_CONFIRM)
  const [actionError, setActionError] = useState<string | null>(null)

  const qc = useQueryClient()

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(e => e + 1)
      setWallNowSec(Math.floor(Date.now() / 1000))
    }, 1_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    queueMicrotask(() => setElapsed(0))
  }, [status])

  const { data: ingestData, isLoading: ingestLoading, isError: ingestError } =
    useMarketIngestServices(token)
  const { data: opsHealth } = useOpsHealth(token)
  const { data: caps } = useOpsCapabilities(token)
  const controlMutation = useControlMarketIngest(token)

  const allServices = ingestData?.services ?? []
  const daemonServices = marketIngestServicesForDaemonAggregate(allServices)
  const engineConfigMissing = !ingestLoading && !ingestError && !daemonServices.some(s => s.id === 'trading_engine')

  const opsErr = useMemo(() => {
    if (ingestError) return 'Failed to load Ops services'
    if (ingestData && typeof ingestData.error === 'string' && ingestData.error.trim()) {
      return ingestData.error
    }
    return null
  }, [ingestError, ingestData])

  const { startingIds, stoppingIds, onControlQueued, refresh } =
    useIngestControlPoll(daemonServices)

  const canOperate = caps?.capabilities?.can_operate === true
  const disableScript =
    opsHealth?.local_control === 'subprocess' && opsHealth.market_ingest_script_control !== true
  const pageEnv = normalizedPageDevProd(opsHealth?.config_profile ?? null)

  const hostColumn = useMemo(
    () => socketServicesHostColumnDisplay({
      configProfile: opsHealth?.config_profile ?? null,
      localControl: opsHealth?.local_control ?? null,
      marketIngestScriptControl: opsHealth?.market_ingest_script_control === true,
    }),
    [opsHealth],
  )

  const rollup = useMemo(() => {
    if (daemonServices.length > 0) {
      return aggregateIngestRedisHealthLamp(daemonServices, status)
    }
    return aggregateDaemonProcessesHealthFromStatus(status)
  }, [daemonServices, status])

  const rollupLamp = rollup.lamp === 'none' ? 'gray' : rollup.lamp
  const rollupTitle = rollup.title

  const refreshAll = useCallback(() => {
    refresh()
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.capabilities })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.opsHealth })
  }, [refresh, qc])

  const handleTokenChange = useCallback((t: string) => {
    setToken(t)
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.ingestServices })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.opsHealth })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.capabilities })
  }, [qc])

  return {
    token,
    elapsed,
    wallNowSec,
    confirm,
    setConfirm,
    actionError,
    setActionError,
    daemonServices,
    engineConfigMissing,
    opsErr,
    ingestLoading,
    ingestError,
    opsHealth,
    caps,
    controlMutation,
    startingIds,
    stoppingIds,
    onControlQueued,
    canOperate,
    disableScript,
    pageEnv,
    hostColumn,
    rollupLamp,
    rollupTitle,
    refreshAll,
    handleTokenChange,
  }
}
