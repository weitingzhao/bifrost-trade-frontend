import { useEffect, useRef, useState } from 'react'
import { getOpsToken } from '@/api/ops'
import { brokerConsoleUrl } from '@/api/celeryConsole'
import type { CeleryConsoleStatus } from './useCeleryWorkerConsole'

export function useCeleryBrokerConsole(enabled: boolean, maxLines = 500) {
  const [lines, setLines] = useState<string[]>([])
  const [status, setStatus] = useState<CeleryConsoleStatus>('idle')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const consoleRef = useRef<HTMLPreElement>(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    if (!enabled) return

    const url = brokerConsoleUrl(maxLines)
    const ac = new AbortController()
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset stream when broker console mounts
    setLines([])
    setErrorDetail(null)
    setStatus('connecting')

    void (async () => {
      try {
        let tokenInUrl = false
        try {
          const u = new URL(url, window.location.origin)
          tokenInUrl = u.searchParams.has('token') || u.searchParams.has('access_token')
        } catch {
          tokenInUrl = false
        }
        const token = getOpsToken()
        const headers: Record<string, string> = { Accept: 'text/event-stream' }
        if (token && !tokenInUrl) headers.Authorization = `Bearer ${token}`
        const crossOrigin = /^https?:\/\//i.test(url)
        const res = await fetch(url, {
          method: 'GET',
          headers,
          signal: ac.signal,
          credentials: crossOrigin ? 'omit' : 'same-origin',
          cache: 'no-store',
        })
        if (!res.ok) {
          const snippet = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 160)
          throw new Error(snippet ? `HTTP ${res.status}: ${snippet}` : `HTTP ${res.status}`)
        }
        const body = res.body
        if (!body) throw new Error('No response body')
        if (!cancelled) setStatus('connected')
        const reader = body.getReader()
        const dec = new TextDecoder()
        let buffer = ''
        while (!cancelled) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += dec.decode(value, { stream: true })
          let sep: number
          while ((sep = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, sep)
            buffer = buffer.slice(sep + 2)
            for (const rawLine of block.split('\n')) {
              const line = rawLine.replace(/\r$/, '')
              if (!line.startsWith('data:')) continue
              const data = line.slice(5).replace(/^\s/, '')
              if (cancelled || ac.signal.aborted) break
              setLines(prev => {
                const next = [...prev, data]
                return next.length > maxLines ? next.slice(next.length - maxLines) : next
              })
            }
          }
        }
        if (!cancelled) setStatus('error')
      } catch (e) {
        if (cancelled || ac.signal.aborted) return
        if (e instanceof Error && e.name === 'AbortError') return
        setStatus('error')
        setErrorDetail(e instanceof Error ? e.message : 'Stream failed')
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [enabled, maxLines])

  useEffect(() => {
    if (!pausedRef.current && consoleRef.current) {
      const container = consoleRef.current.parentElement
      if (container) container.scrollTop = container.scrollHeight
    }
  }, [lines.length])

  return { lines, status, errorDetail, consoleRef, paused, setPaused, clearDisplay: () => { setLines([]); setErrorDetail(null) } }
}
