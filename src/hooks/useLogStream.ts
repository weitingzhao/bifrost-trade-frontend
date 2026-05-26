import { useEffect, useState } from 'react'
import type { LogSourceDef } from '@/api/logs'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'OTHER'

export interface LogEntry {
  id: number
  ts: string       // "HH:mm:ss" display time
  level: LogLevel
  service: string
  message: string
}

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'error'

const MAX_ENTRIES = 1_000
let nextId = 0

// ── Parsing ───────────────────────────────────────────────────────────────────

function normalizeLevel(raw: string): LogLevel {
  const u = raw.toUpperCase()
  if (u === 'ERROR') return 'ERROR'
  if (u === 'WARNING' || u === 'WARN') return 'WARN'
  if (u === 'INFO') return 'INFO'
  if (u === 'DEBUG') return 'DEBUG'
  return 'OTHER'
}

// Matches Python standard logging: "2024-01-15 12:34:56,123 [INFO] ..."
// Also handles no-brackets variant: "2024-01-15 12:34:56,123 INFO ..."
const LINE_RE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(?:[,.]\d+)?\s+\[?(ERROR|WARN(?:ING)?|INFO|DEBUG)\]?\s+(.*)/i

export function parseLine(service: string, raw: string): LogEntry {
  const m = raw.match(LINE_RE)
  if (m) {
    return {
      id: nextId++,
      ts: m[1].slice(11),
      level: normalizeLevel(m[2]),
      service,
      message: m[3].trim(),
    }
  }
  return {
    id: nextId++,
    ts: new Date().toTimeString().slice(0, 8),
    level: 'OTHER',
    service,
    message: raw,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLogStream(sources: LogSourceDef[], enabled: boolean) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<StreamStatus>('idle')
  // Stable key so the effect only re-runs when the source set changes
  const sourcesKey = sources.map(s => s.key).join(',')

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('idle')
      return
    }

    setStatus('connecting')
    setEntries([])

    let cancelled = false
    const unsubs: (() => void)[] = []

    // 1. Fetch initial tail from all sources concurrently
    void Promise.all(
      sources.map(src =>
        src.api.fetch(150).then(({ lines }) => ({ key: src.key, lines })),
      ),
    ).then(results => {
      if (cancelled) return

      const initial: LogEntry[] = []
      for (const { key, lines } of results) {
        for (const line of lines) {
          initial.push(parseLine(key, line))
        }
      }
      initial.sort((a, b) => a.ts.localeCompare(b.ts))
      setEntries(initial.slice(-MAX_ENTRIES))
      setStatus('live')

      // 2. Subscribe SSE for each source
      for (const src of sources) {
        const unsub = src.api.subscribe(
          line => {
            if (cancelled) return
            setEntries(prev => [...prev, parseLine(src.key, line)].slice(-MAX_ENTRIES))
          },
          () => {
            if (!cancelled) setStatus('error')
          },
        )
        unsubs.push(unsub)
      }
    }).catch(() => {
      if (!cancelled) setStatus('error')
    })

    return () => {
      cancelled = true
      unsubs.forEach(f => f())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sourcesKey])

  const errorCount = entries.filter(e => e.level === 'ERROR').length

  function clear() {
    setEntries([])
  }

  return { entries, status, errorCount, clear }
}
