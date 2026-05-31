// ── Generic log API factory ───────────────────────────────────────────────────
// All log endpoints are proxied through the Monitor API (VITE_API_MONITOR).
// Paths: GET /api/{service}/logs?tail=N  →  { lines: string[] }
//        GET /api/{service}/logs/stream  →  SSE  data: { line: string }

import { openSseWithBackoff } from '@/lib/sse'

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
      return openSseWithBackoff(
        `${getBase()}${path}/stream`,
        (raw) => {
          try {
            const data = JSON.parse(raw) as { line?: string }
            if (typeof data.line === 'string') onLine(data.line)
          } catch { /* ignore malformed frames */ }
        },
        onError,
      )
    },
  }
}

// ── Per-service log clients (all routed through Monitor) ─────────────────────

const monitor = () => env.VITE_API_MONITOR as string

export const LOG_APIS = {
  monitor:          makeLogApi(monitor, '/api/monitor/logs'),
  trading:          makeLogApi(monitor, '/api/trading/logs'),
  portfolio:        makeLogApi(monitor, '/api/portfolio/logs'),
  research:         makeLogApi(monitor, '/api/research/logs'),
  strategy:         makeLogApi(monitor, '/api/strategy/logs'),
  market:           makeLogApi(monitor, '/api/market/logs'),
  ops:              makeLogApi(monitor, '/api/ops/logs'),
  // Socket / market ingest edge services (proxied through Monitor API)
  ib_ingestor:      makeLogApi(monitor, '/api/ib-ingestor/logs'),
  ib_account_agent: makeLogApi(monitor, '/api/ib-account-agent/logs'),
  ib_operator:      makeLogApi(monitor, '/api/ib-operator/logs'),
  massive_ws:       makeLogApi(monitor, '/api/massive-ws/logs'),
} as const

export type LogSourceKey = keyof typeof LOG_APIS
export type LogSourceGroup = 'api' | 'edge'

export interface LogSourceGroupDef {
  key: LogSourceGroup
  label: string
}

export const LOG_SOURCE_GROUPS: LogSourceGroupDef[] = [
  { key: 'api',  label: 'API Services' },
  { key: 'edge', label: 'Edge Services' },
]

export interface LogSourceDef {
  key: LogSourceKey
  label: string
  api: LogApi
  group: LogSourceGroup
}

export const LOG_SOURCES: LogSourceDef[] = [
  // API Services — FastAPI microservices
  { key: 'monitor',          label: 'Monitor',       api: LOG_APIS.monitor,          group: 'api'  },
  { key: 'trading',          label: 'Trading',       api: LOG_APIS.trading,          group: 'api'  },
  { key: 'portfolio',        label: 'Portfolio',     api: LOG_APIS.portfolio,        group: 'api'  },
  { key: 'research',         label: 'Research',      api: LOG_APIS.research,         group: 'api'  },
  { key: 'strategy',         label: 'Strategy',      api: LOG_APIS.strategy,         group: 'api'  },
  { key: 'market',           label: 'Market',        api: LOG_APIS.market,           group: 'api'  },
  { key: 'ops',              label: 'Ops',           api: LOG_APIS.ops,              group: 'api'  },
  // Edge Services — IB edge processes & market ingest
  { key: 'ib_ingestor',      label: 'IB Ingestor',   api: LOG_APIS.ib_ingestor,      group: 'edge' },
  { key: 'ib_account_agent', label: 'IB Acct Agent', api: LOG_APIS.ib_account_agent, group: 'edge' },
  { key: 'ib_operator',      label: 'IB Operator',   api: LOG_APIS.ib_operator,      group: 'edge' },
  { key: 'massive_ws',       label: 'Massive WS',    api: LOG_APIS.massive_ws,       group: 'edge' },
]
