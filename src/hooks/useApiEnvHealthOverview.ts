import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildEnvColumn,
  probeApiHealthColumn,
  resolveApiHealthColumnPlans,
  type ColumnPlan,
  type EnvColumnState,
} from '@/utils/apiHealthEnv'
import type { UtilizedServiceRow } from '@/utils/utilizedServices'

const REFRESH_MS = 15_000

export function useApiEnvHealthOverview() {
  const mountedRef = useRef(true)
  const [resolved, setResolved] = useState<{
    dev: ColumnPlan | null
    prod: ColumnPlan | null
    utilizedServices: UtilizedServiceRow[]
  } | null>(null)
  const [devCol, setDevCol] = useState<EnvColumnState | null>(null)
  const [prodCol, setProdCol] = useState<EnvColumnState | null>(null)
  const [lastRefresh, setLastRefresh] = useState('—')
  const [probeBusy, setProbeBusy] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    void resolveApiHealthColumnPlans().then((r) => {
      if (mountedRef.current) setResolved(r)
    })
    return () => {
      mountedRef.current = false
    }
  }, [])

  const runProbe = useCallback(async (plans: { dev: ColumnPlan | null; prod: ColumnPlan | null }) => {
    setProbeBusy(true)
    try {
      const [dSettled, pSettled] = await Promise.allSettled([
        probeApiHealthColumn(plans.dev),
        probeApiHealthColumn(plans.prod),
      ])
      const dProbe = dSettled.status === 'fulfilled' ? dSettled.value : null
      const pProbe = pSettled.status === 'fulfilled' ? pSettled.value : null
      if (!mountedRef.current) return
      setDevCol(buildEnvColumn('Development', plans.dev?.display ?? null, dProbe))
      setProdCol(buildEnvColumn('Production', plans.prod?.display ?? null, pProbe))
      setLastRefresh(new Date().toLocaleTimeString())
    } finally {
      if (mountedRef.current) setProbeBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!resolved) return undefined
    let cancelled = false
    const tick = () => {
      if (!cancelled) void runProbe(resolved)
    }
    tick()
    const t = window.setInterval(tick, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [resolved, runProbe])

  const displayDev =
    devCol ??
    (resolved?.dev ? buildEnvColumn('Development', resolved.dev.display, null) : null)
  const displayProd =
    prodCol ??
    (resolved?.prod ? buildEnvColumn('Production', resolved.prod.display, null) : null)

  return {
    resolved,
    displayDev,
    displayProd,
    lastRefresh,
    probeBusy,
    refresh: resolved ? () => runProbe(resolved) : undefined,
  }
}
