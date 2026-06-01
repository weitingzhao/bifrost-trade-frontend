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

/** Redis console streams for long-running daemon processes (not in global LOG_APIS). */
export const DAEMON_LOG_APIS = {
  daemon_trading: makeLogApi(monitor, '/api/daemon/logs'),
  account_sync:   makeLogApi(monitor, '/api/account-sync-daemon/logs'),
} as const

export type LogSourceKey = keyof typeof LOG_APIS
export type DaemonLogSourceKey = keyof typeof DAEMON_LOG_APIS
export type LogSourceGroup = 'api' | 'edge' | 'daemon'

export interface LogSourceGroupDef {
  key: LogSourceGroup
  label: string
}

export const LOG_SOURCE_GROUPS: LogSourceGroupDef[] = [
  { key: 'api',    label: 'API Services' },
  { key: 'edge',   label: 'Edge Services' },
  { key: 'daemon', label: 'Daemon' },
]

export interface LogSourceDef {
  key: string
  label: string
  api: LogApi
  group?: LogSourceGroup
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
  // Daemon — Redis console streams (Strategy Trading + Account Sync)
  { key: 'daemon_trading', label: 'Strategy Trading', api: DAEMON_LOG_APIS.daemon_trading, group: 'daemon' },
  { key: 'account_sync',   label: 'Account Sync',     api: DAEMON_LOG_APIS.account_sync,   group: 'daemon' },
]

/** Socket Services page — fixed 4-source log console. */
export const SOCKET_LOG_SOURCES: LogSourceDef[] = LOG_SOURCES.filter(s =>
  (['massive_ws', 'ib_operator', 'ib_ingestor', 'ib_account_agent'] as LogSourceKey[]).includes(s.key as LogSourceKey),
)

/** Daemon Redis consoles (subset of global LOG_SOURCES). */
export const DAEMON_LOG_SOURCES: LogSourceDef[] = LOG_SOURCES.filter(s => s.group === 'daemon')

async function clearLogStream(path: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${monitor()}${path}`, { method: 'DELETE' })
    const j = await r.json().catch(() => ({})) as { ok?: boolean; error?: string }
    return { ok: r.ok && j.ok !== false, error: j.error }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Clear failed' }
  }
}

export async function clearMassiveWsLogs(): Promise<{ ok: boolean; error?: string }> {
  return clearLogStream('/api/massive-ws/logs')
}

export async function clearIbOperatorLogs(): Promise<{ ok: boolean; error?: string }> {
  return clearLogStream('/api/ib-operator/logs')
}

export async function clearIbIngestorLogs(): Promise<{ ok: boolean; error?: string }> {
  return clearLogStream('/api/ib-ingestor/logs')
}

export async function clearIbAccountAgentLogs(): Promise<{ ok: boolean; error?: string }> {
  return clearLogStream('/api/ib-account-agent/logs')
}

export async function clearDaemonTradingLogs(): Promise<{ ok: boolean; error?: string }> {
  return clearLogStream('/api/daemon/logs')
}

export async function clearAccountSyncDaemonLogs(): Promise<{ ok: boolean; error?: string }> {
  return clearLogStream('/api/account-sync-daemon/logs')
}

export async function clearAllDaemonLogs(): Promise<{ ok: boolean; errors: string[] }> {
  const results = await Promise.allSettled([
    clearDaemonTradingLogs(),
    clearAccountSyncDaemonLogs(),
  ])
  const errors: string[] = []
  let ok = true
  for (const r of results) {
    if (r.status === 'rejected') {
      ok = false
      errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason))
    } else if (!r.value.ok) {
      ok = false
      if (r.value.error) errors.push(r.value.error)
    }
  }
  return { ok, errors }
}

export async function clearAllSocketServiceLogs(): Promise<{ ok: boolean; errors: string[] }> {
  const results = await Promise.allSettled([
    clearMassiveWsLogs(),
    clearIbOperatorLogs(),
    clearIbIngestorLogs(),
    clearIbAccountAgentLogs(),
  ])
  const errors: string[] = []
  let ok = true
  for (const r of results) {
    if (r.status === 'rejected') {
      ok = false
      errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason))
    } else if (!r.value.ok) {
      ok = false
      if (r.value.error) errors.push(r.value.error)
    }
  }
  return { ok, errors }
}
