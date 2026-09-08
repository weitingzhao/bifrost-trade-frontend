// ── Generic log API factory ───────────────────────────────────────────────────
// All log endpoints are proxied through the Monitor API.
// Paths: GET /api/{service}/logs?tail=N  →  { lines: string[] }
//        GET /api/{service}/logs/stream  →  SSE  data: { line: string }
// DEV: monitorUrl() → /api/monitor/api/{service}/logs (Vite proxy → K3s)
//
// Every one of these endpoints reads a Redis Stream under `bifrost:console:*`.
// A service only appears there if it installs a RedisStreamLogHandler at
// startup. On K3s exactly one still does — see OFFLINE_* below.

import { openSseWithBackoff } from '@/lib/sse'
import { monitorUrl } from '@/lib/devApiUrl'

export interface LogApi {
  fetch(tail?: number): Promise<{ lines: string[] }>
  subscribe(onLine: (line: string) => void, onError?: () => void): () => void
}

function makeLogApi(path: string): LogApi {
  return {
    async fetch(tail = 150) {
      const params = new URLSearchParams({ tail: String(tail) })
      try {
        const r = await fetch(`${monitorUrl(path)}?${params}`, {
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
        monitorUrl(`${path}/stream`),
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

// ── Why a source is silent ────────────────────────────────────────────────────
// Verified 2026-09-08 against the cluster: `--scan --pattern '*console*'` over
// all five Redis instances (dev, live-stg, live-prod, ib, massive) returns a
// single key, `bifrost:console:account_sync_daemon`. Every other endpoint below
// answers HTTP 200 with `{"lines":[]}` and always will until a producer exists.

/** Process is gone: the eight API domains run as four Deployments. */
const OFFLINE_NO_PROCESS =
  'No such process — the API domains run as api-monitor / api-account / api-market / api-research'

/** Process runs, but its launcher no longer installs the Redis log handler. */
const OFFLINE_NO_HANDLER =
  'Process runs, but scripts/run_server.py no longer writes a Redis console stream'

/**
 * Superseded by the Ops Platform. The ops catalog still lists these three as
 * Trade services, but their Deployments (ib-operator / ib-market-gateway /
 * ib-account-agent) exist in no namespace; IB connectivity now runs as
 * data/ib-gateway on bifrost-platform-plugin-ib-gateway.
 */
const OFFLINE_PLATFORM_GATEWAY =
  'Superseded by the Ops Platform IB gateway (data/ib-gateway) — the Trade-side deployment is gone'

/** Strategy daemon logs to stdout only (kubectl logs / Loki). */
const OFFLINE_STDOUT_ONLY =
  'The daemon logs to stdout only — bifrost:console:*:daemon_trading has no producer'

export type LogSourceGroup = 'api' | 'edge' | 'daemon'

export interface LogSourceGroupDef {
  key: LogSourceGroup
  label: string
}

export const LOG_SOURCE_GROUPS: LogSourceGroupDef[] = [
  { key: 'api',    label: 'API Services' },
  { key: 'edge',   label: 'Socket Services' },
  { key: 'daemon', label: 'Daemon' },
]

export interface LogSourceDef {
  key: string
  label: string
  api: LogApi
  group: LogSourceGroup
  /** `null` when a live producer writes this stream; otherwise why it is empty. */
  offlineReason: string | null
}

export const LOG_SOURCES: LogSourceDef[] = [
  // API Services — FastAPI microservices
  { key: 'monitor',   label: 'Monitor',   api: makeLogApi('/api/monitor/logs'),   group: 'api', offlineReason: OFFLINE_NO_HANDLER },
  { key: 'research',  label: 'Research',  api: makeLogApi('/api/research/logs'),  group: 'api', offlineReason: OFFLINE_NO_HANDLER },
  { key: 'market',    label: 'Market',    api: makeLogApi('/api/market/logs'),    group: 'api', offlineReason: OFFLINE_NO_HANDLER },
  { key: 'trading',   label: 'Trading',   api: makeLogApi('/api/trading/logs'),   group: 'api', offlineReason: OFFLINE_NO_PROCESS },
  { key: 'portfolio', label: 'Portfolio', api: makeLogApi('/api/portfolio/logs'), group: 'api', offlineReason: OFFLINE_NO_PROCESS },
  { key: 'strategy',  label: 'Strategy',  api: makeLogApi('/api/strategy/logs'),  group: 'api', offlineReason: OFFLINE_NO_PROCESS },
  { key: 'ops',       label: 'Ops',       api: makeLogApi('/api/ops/logs'),       group: 'api', offlineReason: OFFLINE_NO_PROCESS },
  { key: 'docs',      label: 'Docs',      api: makeLogApi('/api/docs/logs'),      group: 'api', offlineReason: OFFLINE_NO_PROCESS },
  // Socket Services — now fronted by the platform IB gateway plugin
  { key: 'ib_ingestor',      label: 'IB INGESTOR',   api: makeLogApi('/api/ib-ingestor/logs'),      group: 'edge', offlineReason: OFFLINE_PLATFORM_GATEWAY },
  { key: 'ib_account_agent', label: 'IB ACCT AGENT', api: makeLogApi('/api/ib-account-agent/logs'), group: 'edge', offlineReason: OFFLINE_PLATFORM_GATEWAY },
  { key: 'ib_operator',      label: 'IB OPERATOR',   api: makeLogApi('/api/ib-operator/logs'),      group: 'edge', offlineReason: OFFLINE_PLATFORM_GATEWAY },
  // Daemon — Redis console streams
  { key: 'daemon_trading', label: 'Strategy Trading', api: makeLogApi('/api/daemon/logs'),               group: 'daemon', offlineReason: OFFLINE_STDOUT_ONLY },
  { key: 'account_sync',   label: 'Account Sync',     api: makeLogApi('/api/account-sync-daemon/logs'), group: 'daemon', offlineReason: null },
]

/** The only sources that can ever return lines. */
export const LIVE_LOG_SOURCES: LogSourceDef[] = LOG_SOURCES.filter(s => s.offlineReason === null)

/** Colored service badges for the global LogPanel. */
export const LOG_SOURCE_TAGS: Record<string, string> = {
  monitor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  docs: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  ops: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  ib_operator: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  ib_ingestor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  ib_account_agent: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  trading: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  portfolio: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  research: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  strategy: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  market: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  daemon_trading: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  account_sync: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}
