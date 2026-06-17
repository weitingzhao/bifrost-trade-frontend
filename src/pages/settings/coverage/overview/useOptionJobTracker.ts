import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeMassiveJobEvents } from '@/api/massive'
import type { MassiveJobApiRow } from '@/types/ops'

export interface OptionJobTrackItem {
  job_id: string
  kindLabel: string
  symbol: string
  status: string
  enqueuedAt: number
  deduplicated?: boolean
  error?: string
}

const MAX_TRACKED = 128
const MAX_CONCURRENT_SSE = 8

export function useOptionJobTracker(onTerminal?: () => void) {
  const [items, setItems] = useState<OptionJobTrackItem[]>([])
  const closersRef = useRef<Map<string, () => void>>(new Map())
  const queueRef = useRef<string[]>([])
  const activeRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startSseRef = useRef<(jobId: string) => void>(() => {})

  useEffect(
    () => () => {
      closersRef.current.forEach(c => c())
      closersRef.current.clear()
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    },
    [],
  )

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      onTerminal?.()
      refreshTimerRef.current = null
    }, 1200)
  }, [onTerminal])

  const drainQueue = useCallback(() => {
    while (activeRef.current < MAX_CONCURRENT_SSE && queueRef.current.length > 0) {
      const next = queueRef.current.shift()
      if (next) startSseRef.current(next)
    }
  }, [])

  useEffect(() => {
    startSseRef.current = (jobId: string) => {
      if (closersRef.current.has(jobId) || queueRef.current.includes(jobId)) return
      activeRef.current += 1
      const sub = subscribeMassiveJobEvents(jobId, data => {
        const st = data.job?.status
        setItems(prev =>
          prev.map(it =>
            it.job_id === jobId
              ? {
                  ...it,
                  status: st ?? (data.ok ? it.status : 'failed'),
                  error: data.error ?? it.error,
                }
              : it,
          ),
        )
        if (!data.ok || st === 'done' || st === 'failed') {
          sub.close()
          closersRef.current.delete(jobId)
          activeRef.current = Math.max(0, activeRef.current - 1)
          scheduleRefresh()
          drainQueue()
        }
      })
      closersRef.current.set(jobId, () => sub.close())
    }
  }, [scheduleRefresh, drainQueue])

  const trackJob = useCallback(
    (jobId: string, kindLabel: string, symbol: string, deduplicated?: boolean) => {
      setItems(prev => {
        const next = [
          {
            job_id: jobId,
            kindLabel,
            symbol,
            status: 'pending',
            enqueuedAt: Date.now(),
            deduplicated,
          },
          ...prev.filter(it => it.job_id !== jobId),
        ]
        return next.slice(0, MAX_TRACKED)
      })
      if (activeRef.current >= MAX_CONCURRENT_SSE) {
        queueRef.current.push(jobId)
      } else {
        startSseRef.current(jobId)
      }
    },
    [],
  )

  const activeCount = items.filter(
    it => it.status !== 'done' && it.status !== 'failed',
  ).length

  return { items, trackJob, activeCount, clearItems: () => setItems([]) }
}

export type { MassiveJobApiRow }
