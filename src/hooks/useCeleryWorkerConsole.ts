import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearCeleryLogs,
  fetchCeleryLogs,
  subscribeWorkerConsole,
} from '@/api/celeryConsole'

export type CeleryConsoleStatus = 'idle' | 'connecting' | 'connected' | 'error'

export function useCeleryWorkerConsole(workerId: string, enabled: boolean, maxLines = 500) {
  const [lines, setLines] = useState<string[]>([])
  const [status, setStatus] = useState<CeleryConsoleStatus>('idle')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const consoleRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!enabled || !workerId) return

    let unsub: (() => void) | null = null
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset stream when worker target changes
    setLines([])
    setErrorDetail(null)
    setStatus('connecting')

    void fetchCeleryLogs(workerId, maxLines)
      .then(res => {
        if (cancelled) return
        const fetched = res.lines ?? []
        const trimmed = fetched.length > maxLines ? fetched.slice(-maxLines) : fetched
        setLines(trimmed)
        if (res.error) {
          setErrorDetail(res.error)
          setStatus('error')
          return
        }
        setStatus('connected')
        unsub = subscribeWorkerConsole(
          workerId,
          line => {
            if (cancelled) return
            setLines(prev => [...prev, line].slice(-maxLines))
          },
          () => {
            if (!cancelled) {
              setStatus('error')
              setErrorDetail('Live stream disconnected (retry by switching target or refreshing).')
            }
          },
        )
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setErrorDetail('Request failed (network or CORS). Check Ops API is reachable.')
        }
      })

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [enabled, workerId, maxLines])

  useEffect(() => {
    const el = consoleRef.current?.parentElement
    if (el) el.scrollTop = el.scrollHeight
  }, [lines.length])

  const clear = useCallback(async () => {
    await clearCeleryLogs(workerId)
    setLines([])
    setErrorDetail(null)
  }, [workerId])

  const selectAll = useCallback(() => {
    const pre = consoleRef.current
    if (!pre) return
    const range = document.createRange()
    range.selectNodeContents(pre)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [])

  return { lines, status, errorDetail, consoleRef, clear, selectAll }
}
