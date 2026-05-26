// ── Generic log API factory ───────────────────────────────────────────────────
// All log endpoints are proxied through the Monitor API (VITE_API_MONITOR).
// Paths: GET /api/{service}/logs?tail=N  →  { lines: string[] }
//        GET /api/{service}/logs/stream  →  SSE  data: { line: string }

const env = import.meta.env

export interface LogApi {
  fetch(tail?: number): Promise<{ lines: string[] }>
  subscribe(onLine: (line: string) => void, onError?: () => void): () => void
}

function makeLogApi(getBase: () => string, path: string): LogApi {
  return {
    async fetch(tail = 150) {
      const params = new URLSearchParams({ tail: String(tail) })
      try {
        const r = await fetch(`${getBase()}${path}?${params}`, {
          signal: AbortSignal.timeout(8_000),
        })
        const j = await r.json().catch(() => ({ lines: [] }))
        return { lines: Array.isArray(j.lines) ? (j.lines as string[]) : [] }
      } catch {
        return { lines: [] }
      }
    },

    subscribe(onLine, onError) {
      const es = new EventSource(`${getBase()}${path}/stream`)
      es.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data as string) as { line?: string }
          if (typeof data.line === 'string') onLine(data.line)
        } catch { /* ignore malformed frames */ }
      }
      es.onerror = () => {
        onError?.()
        es.close()
      }
      return () => es.close()
    },
  }
}

// ── Per-service log clients (all routed through Monitor) ─────────────────────

const monitor = () => env.VITE_API_MONITOR as string

export const LOG_APIS = {
  monitor:   makeLogApi(monitor, '/api/monitor/logs'),
  trading:   makeLogApi(monitor, '/api/trading/logs'),
  portfolio: makeLogApi(monitor, '/api/portfolio/logs'),
  research:  makeLogApi(monitor, '/api/research/logs'),
  strategy:  makeLogApi(monitor, '/api/strategy/logs'),
  market:    makeLogApi(monitor, '/api/market/logs'),
  ops:       makeLogApi(monitor, '/api/ops/logs'),
} as const

export type LogSourceKey = keyof typeof LOG_APIS

export interface LogSourceDef {
  key: LogSourceKey
  label: string
  api: LogApi
}

export const LOG_SOURCES: LogSourceDef[] = [
  { key: 'monitor',   label: 'Monitor',   api: LOG_APIS.monitor   },
  { key: 'trading',   label: 'Trading',   api: LOG_APIS.trading   },
  { key: 'portfolio', label: 'Portfolio', api: LOG_APIS.portfolio },
  { key: 'research',  label: 'Research',  api: LOG_APIS.research  },
  { key: 'strategy',  label: 'Strategy',  api: LOG_APIS.strategy  },
  { key: 'market',    label: 'Market',    api: LOG_APIS.market    },
  { key: 'ops',       label: 'Ops',       api: LOG_APIS.ops       },
]
