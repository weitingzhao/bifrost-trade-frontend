/**
 * How the Ops Platform plugins under the Trade cockpit are doing.
 *
 * Trade runs on top of three platform plugins. When one of them stops, the
 * symptom shows up in a Trade page — a stale chain, a missing execution, an
 * empty position — with nothing on screen to say which plugin caused it. On
 * 2026-09-07 ib-gateway could not reach TWS for seventeen hours and the only
 * trace in this UI was "Market Streams Offline" in the top bar.
 *
 * platform-api answers these; nothing here talks to Kubernetes or knows what a
 * plugin does internally. Every plugin returns a different shape, so this
 * module keeps only what they share and treats the rest as optional detail.
 */
import { withValidation } from '@/lib/apiValidation'
import { platformPluginStatusUrl } from '@/lib/devApiUrl'
import { PluginStatusSchema } from '@/lib/schemas/platform'

export interface PluginDeployment {
  namespace?: string
  name?: string
  ready?: string
  reachability?: string
  detail?: string
}

export interface PluginWorker {
  pool?: string
  status?: string
  jobs_done?: number
  jobs_failed?: number
  uptime_sec?: number
  last_claim_at?: string
}

export interface PluginStatus {
  reachable: boolean
  reachability?: string
  summary?: string
  /** Why the platform's own probe could not answer — not the plugin's fault. */
  error?: string
  hint?: string
  generated_at?: string
  deployments?: PluginDeployment[]
  workers?: PluginWorker[]
}

export interface PlatformPluginDef {
  key: string
  label: string
  /** Which part of Trade goes dark when this plugin does. */
  supports: string
}

/**
 * Research is deliberately absent: it is the second payload, not a platform
 * plugin, its own pages carry its health, and platform-api answers nothing but
 * `reachable` for it.
 */
export const PLATFORM_PLUGINS: PlatformPluginDef[] = [
  {
    key: 'market-data',
    label: 'Market Data',
    supports: 'Quotes, bars and option chains — Market, Research, Option Discovery',
  },
  {
    key: 'flex-query',
    label: 'Flex Query',
    supports: 'Executions and cash activity — Trade Ledger, Transfer & Pay',
  },
  {
    key: 'ib-gateway',
    label: 'IB Gateway',
    supports: 'The broker link — positions, account values, live streams',
  },
]

const validate = withValidation<PluginStatus>(PluginStatusSchema, 'platform/plugin-status')

/**
 * A probe that never answers is worse than one that says no: the status bar
 * polls this on every page, so a hanging request would stack a new pair of
 * sockets every interval and leave the lamp mid-read forever. Eight seconds is
 * past any healthy answer and short of the gateway's own ceiling.
 */
const PROBE_TIMEOUT_MS = 8_000

function withDeadline(signal?: AbortSignal): AbortSignal | undefined {
  const deadline = AbortSignal.timeout?.(PROBE_TIMEOUT_MS)
  if (!deadline) return signal
  if (!signal) return deadline
  return AbortSignal.any?.([signal, deadline]) ?? deadline
}

export async function fetchPluginStatus(key: string, signal?: AbortSignal): Promise<PluginStatus> {
  const res = await fetch(platformPluginStatusUrl(key), { signal: withDeadline(signal) })
  if (!res.ok) throw new Error(`platform plugin ${key}: HTTP ${res.status}`)
  return validate(await res.json())
}

export type PluginLamp = 'ok' | 'degraded' | 'down' | 'unknown'

/**
 * `reachable: false` with an `error` means the platform's probe broke, not the
 * plugin — the cluster's platform-api currently cannot run kubectl, so its
 * ib-gateway probe always fails. That is "unknown", not "down": claiming a
 * healthy plugin is dead is the same failure as claiming a dead one is fine.
 */
export function pluginLamp(s: PluginStatus | undefined): PluginLamp {
  if (!s) return 'unknown'
  const r = (s.reachability ?? '').toLowerCase()
  if (r === 'ok') return 'ok'
  if (r === 'degraded') return 'degraded'
  if (r === 'down' || r === 'error' || r === 'failed') return 'down'
  if (s.error) return 'unknown'
  return s.reachable ? 'ok' : 'down'
}

/** Plugins that want a look — what the sidebar badge counts. */
export function needsAttention(lamp: PluginLamp): boolean {
  return lamp !== 'ok'
}
