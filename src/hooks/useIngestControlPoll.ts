import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { MarketIngestServiceRow } from '@/utils/socketIngestLamp'

const POLL_MS = 4_000
const START_TIMEOUT_MS = 70_000
const STOP_TIMEOUT_MS = 75_000

export function useIngestControlPoll(services: MarketIngestServiceRow[]) {
  const qc = useQueryClient()
  const [startingIds, setStartingIds] = useState<ReadonlySet<string>>(new Set())
  const [stoppingIds, setStoppingIds] = useState<ReadonlySet<string>>(new Set())
  const startTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const stopTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const startTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const stopTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.ingestServices })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
  }, [qc])

  const clearStartPoll = useCallback((serviceId: string) => {
    const interval = startTimersRef.current.get(serviceId)
    if (interval != null) clearInterval(interval)
    startTimersRef.current.delete(serviceId)
    const timeout = startTimeoutRef.current.get(serviceId)
    if (timeout != null) clearTimeout(timeout)
    startTimeoutRef.current.delete(serviceId)
    setStartingIds(prev => {
      if (!prev.has(serviceId)) return prev
      const next = new Set(prev)
      next.delete(serviceId)
      return next
    })
  }, [])

  const clearStopPoll = useCallback((serviceId: string) => {
    const interval = stopTimersRef.current.get(serviceId)
    if (interval != null) clearInterval(interval)
    stopTimersRef.current.delete(serviceId)
    const timeout = stopTimeoutRef.current.get(serviceId)
    if (timeout != null) clearTimeout(timeout)
    stopTimeoutRef.current.delete(serviceId)
    setStoppingIds(prev => {
      if (!prev.has(serviceId)) return prev
      const next = new Set(prev)
      next.delete(serviceId)
      return next
    })
  }, [])

  const beginStartPolling = useCallback((serviceId: string) => {
    clearStartPoll(serviceId)
    setStartingIds(prev => new Set([...prev, serviceId]))
    const intervalId = setInterval(refresh, POLL_MS)
    startTimersRef.current.set(serviceId, intervalId)
    const timeoutId = setTimeout(() => clearStartPoll(serviceId), START_TIMEOUT_MS)
    startTimeoutRef.current.set(serviceId, timeoutId)
    refresh()
  }, [clearStartPoll, refresh])

  const beginStopPolling = useCallback((serviceId: string) => {
    clearStopPoll(serviceId)
    setStoppingIds(prev => new Set([...prev, serviceId]))
    const intervalId = setInterval(refresh, POLL_MS)
    stopTimersRef.current.set(serviceId, intervalId)
    const timeoutId = setTimeout(() => clearStopPoll(serviceId), STOP_TIMEOUT_MS)
    stopTimeoutRef.current.set(serviceId, timeoutId)
    refresh()
  }, [clearStopPoll, refresh])

  useEffect(() => {
    if (startingIds.size === 0) return
    for (const svcId of startingIds) {
      const svc = services.find(s => s.id === svcId)
      if (svc?.process_active === 'active') {
        queueMicrotask(() => clearStartPoll(svcId))
      }
    }
  }, [services, startingIds, clearStartPoll])

  useEffect(() => {
    if (stoppingIds.size === 0) return
    for (const svcId of stoppingIds) {
      const svc = services.find(s => s.id === svcId)
      if (svc && svc.process_active !== 'active') {
        queueMicrotask(() => clearStopPoll(svcId))
      }
    }
  }, [services, stoppingIds, clearStopPoll])

  useEffect(() => {
    const startTimers = startTimersRef.current
    const stopTimers = stopTimersRef.current
    const startTimeouts = startTimeoutRef.current
    const stopTimeouts = stopTimeoutRef.current
    return () => {
      for (const id of startTimers.values()) clearInterval(id)
      for (const id of stopTimers.values()) clearInterval(id)
      for (const id of startTimeouts.values()) clearTimeout(id)
      for (const id of stopTimeouts.values()) clearTimeout(id)
    }
  }, [])

  function onControlQueued(serviceId: string, action: 'start' | 'stop' | 'restart' | 'reset') {
    if (action === 'stop') {
      beginStopPolling(serviceId)
    } else {
      beginStartPolling(serviceId)
    }
  }

  return {
    startingIds,
    stoppingIds,
    onControlQueued,
    refresh,
  }
}
