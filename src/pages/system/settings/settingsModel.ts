/**
 * The trader's own configuration, read rather than restated.
 *
 * `Settings.dc.html` is the other half of the Owner's 2026-09-15 collapse:
 * System becomes Status and this. Its footer sets the boundary — *原 System ›
 * Configuration › IB Connection 并入本页；集群、pipeline、市场数据基础设施的
 * 配置属于 Ops Console* — so there are three panels and nothing about the
 * cluster on any of them.
 *
 * The prototype is read-only and says so: *此页原型只读——编辑动作在实现侧接
 * YAML/配置存储*. The implementation side is this page since the Owner's
 * 2026-09-25 call: each row edits in place through the same two writes the
 * retired IB Connection page used, and the two YAML rows open their full
 * reading, because config.yaml has no write route.
 */
import type { FlexAccountItem, IbClientPort, StatusResponse } from '@/types/monitor'
import type { FlexConfigSummary } from '@/api/flexQueryPlugin'
import type { FlexCoverageFreshnessResponse } from '@/types/trading'
/** Same shape as `fmtSince`, with the clock passed in so this stays pure. */
function ageWords(elapsedSec: number): string {
  const e = Math.max(0, Math.floor(elapsedSec))
  if (e < 60) return `${e}s`
  if (e < 3600) return `${Math.floor(e / 60)}m`
  if (e < 86400) return `${Math.floor(e / 3600)}h`
  return `${Math.floor(e / 86400)}d`
}

export interface SettingRow {
  /** Which editor or reading the row opens. */
  id: string
  label: string
  /** What it is, in the design's own words. */
  what: string
  /** The value as it stands — never a secret, only whether one is set. */
  reading: string
}

/** The IB slots that answered, out of the ones configured. */
export function ibSlotStanding(status: StatusResponse | undefined): string {
  if (!status) return 'not probed'
  const slots = ['ib_ingestor', 'ib_account_agent', 'ib_operator'] as const
  const socket = (status.socket ?? {}) as Record<string, { connected?: boolean } | undefined>
  const connected = slots.filter((k) => socket[k]?.connected === true).length
  return connected === slots.length
    ? `${connected} agents connected`
    : `${connected} of ${slots.length} agents connected`
}

export function ibRows(status: StatusResponse | undefined): SettingRow[] {
  const c = status?.config?.ib_client
  const client = c?.client
  const account = c?.account
  // `— · —` is not a reading; a row with nothing behind it says `—` once.
  const ports = [client?.host_port_type, client?.secondary_port_type].filter(Boolean)
  return [
    {
      id: 'ib-user',
      label: 'User (YAML)',
      what: 'Login mapping per slot — host · secondary',
      // The login names were purged from this app on 2026-09-16; a slot is
      // identified by where it connects, which is what the YAML actually maps.
      reading: client?.host_ip ? `host ${client.host_ip} · secondary ${client.secondary_host_ip ?? '—'}` : '—',
    },
    {
      id: 'ib-client',
      label: 'Client ID (YAML)',
      what: 'Client IDs per agent · ib.host.client_id.* · secondary ingestor optional',
      reading: ports.length > 0 ? ports.join(' · ') : '—',
    },
    {
      id: 'ib-account',
      label: 'Account',
      what: 'The IB account the daemon trades and writes positions for',
      reading: account?.trading
        ? `${account.trading}${account.event_secondary && account.event_secondary !== account.trading ? ` · events ${account.event_host ?? '—'} / ${account.event_secondary}` : ''}`
        : '—',
    },
  ]
}

export interface FlexStanding {
  /** The header line: when each kind last landed. */
  text: string
  tone: 'ok' | 'warn' | 'gray'
}

/**
 * When Flex last landed, per kind.
 *
 * The design's header reads `daily 08:30 · missed today, ran 06:02` — a
 * schedule and a comparison against it. The plugin exposes neither: its
 * schedule is Dagster's and no route reports it, so this says what *did*
 * land and when, which is the half that can be read.
 */
export function flexStanding(
  freshness: FlexCoverageFreshnessResponse | undefined,
  nowMs: number,
): FlexStanding {
  const dims = freshness?.dimensions ?? []
  if (dims.length === 0) return { text: 'no pull recorded', tone: 'gray' }
  const parts = dims.map((d) => {
    const ts = d.latest_ts ? Date.parse(d.latest_ts) : NaN
    const age = Number.isFinite(ts) ? `${ageWords((nowMs - ts) / 1000)} ago` : 'never'
    return `${d.dimension.replace(/^flex-/, '')} ${age}`
  })
  const oldestMs = Math.min(
    ...dims.map((d) => (d.latest_ts ? Date.parse(d.latest_ts) : Number.POSITIVE_INFINITY)),
  )
  const staleHours = Number.isFinite(oldestMs) ? (nowMs - oldestMs) / 3_600_000 : Infinity
  return {
    text: parts.join(' · '),
    // A daily pull older than a day and a half has missed one.
    tone: staleHours > 36 ? 'warn' : 'ok',
  }
}

export function flexRows(summary: FlexConfigSummary | undefined): SettingRow[] {
  const t = summary?.tokens
  const rows = summary?.query_rows ?? []
  const named = rows.filter((r) => (r.query_host_id ?? '').trim().length > 0).length
  return [
    {
      id: 'flex-query',
      label: 'Flex Query',
      what: 'Query id + token per account',
      // Never the token — only whether one is set, and its last four, which is
      // what the plugin itself reports.
      reading: t?.host_token_set
        ? `token set (…${t.host_token_last4 ?? '????'})${t.secondary_token_set ? ` · secondary …${t.secondary_token_last4 ?? '????'}` : ''}`
        : 'no token set',
    },
    {
      id: 'flex-preference',
      label: 'Flex Preference',
      what: 'Which Flex queries import, and how they map to Execution',
      reading: rows.length === 0 ? 'no query rows' : `${named} of ${rows.length} queries have an id`,
    },
    {
      id: 'flex-range',
      label: 'Range',
      what: 'How far back a pull reaches — the default, and the first one',
      reading: summary ? `${summary.range_days.default}d · first run ${summary.range_days.init}d` : '—',
    },
  ]
}

/** The two Flex queries the plugin runs, in the order the editor lists them. */
export const FLEX_QUERY_TYPES: readonly { purpose: string; label: string }[] = [
  { purpose: 'cash_transactions', label: 'Cash Transactions' },
  { purpose: 'trades', label: 'Trades' },
]

/** One editable row per query the plugin runs, whatever the store holds. */
export function initFlexRows(stored: FlexAccountItem[] | null | undefined): FlexAccountItem[] {
  return FLEX_QUERY_TYPES.map(({ purpose, label }) => {
    const row = (stored ?? []).find((r) => (r.purpose ?? 'cash_transactions') === purpose)
    return {
      purpose,
      query_label: label,
      query_host_id: row?.query_host_id ?? '',
      query_secondary_id: row?.query_secondary_id ?? '',
    }
  })
}

const PORT_LABELS: Record<string, string> = {
  tws_paper: 'TWS Paper (7497)',
  tws_live: 'TWS Live (7496)',
  gateway: 'Gateway (4002)',
}

/** A read-only line of the YAML: one value per slot. */
export interface SlotLine {
  label: string
  /** Set when the line is the first of a group — the table prints a header row. */
  group?: string
  host: string
  secondary: string
}

/** Where each slot connects — the `User (YAML)` row opened. */
export function ibConnectionLines(status: StatusResponse | undefined): SlotLine[] {
  const client = status?.config?.ib_client?.client
  const secondaryOn = Boolean(client?.secondary_host_ip?.trim())
  const port = (t: string | null | undefined) => (t ? (PORT_LABELS[t] ?? t) : '—')
  return [
    { label: 'IP / host', host: client?.host_ip || '—', secondary: secondaryOn ? String(client?.secondary_host_ip) : 'disabled' },
    { label: 'Port type', host: port(client?.host_port_type), secondary: secondaryOn ? port(client?.secondary_port_type) : '—' },
  ]
}

/** Every client id the YAML assigns — the `Client ID (YAML)` row opened. */
export function ibClientIdLines(status: StatusResponse | undefined): SlotLine[] {
  const p: IbClientPort = status?.config?.ib_client?.port ?? {}
  const secondaryOn = Boolean(status?.config?.ib_client?.client?.secondary_host_ip?.trim())
  const id = (v: number | string | null | undefined) => (v == null || v === '' ? '—' : String(v))
  const second = (v: number | string | null | undefined) => (secondaryOn ? id(v) : '—')
  return [
    { group: 'Daemon', label: 'Trading', host: id(p.trading), secondary: '—' },
    { label: 'Listener', host: id(p.listener_host), secondary: id(p.listener_secondary) },
    { group: 'Socket services', label: 'Operator (cmd RPC)', host: id(p.operator_host), secondary: second(p.operator_secondary) },
    { label: 'Ingestor', host: id(p.ingestor), secondary: '—' },
    { label: 'Account agent', host: id(p.account_agent), secondary: second(p.account_agent_secondary) },
  ]
}
